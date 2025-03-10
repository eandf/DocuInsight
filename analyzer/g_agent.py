from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from openai import OpenAI
from groq import Groq
import json
import time
import os

from file_io import load_file_content


class TokenUsage(BaseModel):
    input: int
    output: int


class EstimatedCost(BaseModel):
    last_set: str
    big_model_cost_dollars: float
    small_model_cost_dollars: float
    total_cost_dollars: float


class Report(BaseModel):
    key_commitments: List[str]
    important_risks: List[str]
    plain_english_summary: str
    unusual_terms: List[str]
    recommended_actions: List[str]
    key_clauses: Dict[str, str]


class GAgentConfig(BaseModel):
    """
    The user only needs to provide:
      - big_model (str)
      - small_model (str)
      - document_type (str)
      - specific_concerns (str)
      - last_cost_values_set_date (str)
      - prices (dict)

    The code will figure out which provider (openai or groq) is used for each model
    by looking up the model names in the 'prices' dictionary.
    """

    big_model: str
    small_model: str
    document_type: str = "UNKNOWN"
    specific_concerns: str = "UNKNOWN"
    last_cost_values_set_date: Optional[str] = None
    prices: Dict[str, Dict[str, Dict[str, float]]] = Field(
        default_factory=dict, description="Pricing details for the model"
    )


class GAgent:
    SYSTEM_CONTEXT_EXTRACTION = """
You are a highly skilled assistant specialized in extracting JSON data from text. 
Your task is to identify and isolate valid JSON objects embedded in the text. If there are multiple JSON objects, extract them all.
    """

    OUTPUT_INSTRUCTIONS_EXTRACTION = """
Please provide the extracted JSON objects exactly as they appear in the text. If no JSON is found, return an empty JSON object: {}.
    """

    SYSTEM_CONTEXT_ANALYSIS = """
You are a highly experienced legal document analyzer with expertise in breaking down complex contracts into clear, understandable explanations. Your goal is to help individuals understand exactly what they are agreeing to before signing documents.

Take your time to think through each aspect of the document carefully. Consider:
1. The implications of each clause
2. The commitments being made
3. The potential risks
4. Any unusual or concerning terms
5. The rights being granted or waived
6. The obligations being assumed
    """

    ANALYSIS_FRAMEWORK = """
For the above legal document, please conduct a thorough analysis by following these steps:

1. Initial Document Assessment
- Document type and purpose
- Key parties involved
- Overall structure

2. Core Commitments Analysis
- What the signing party is agreeing to do
- What the signing party is agreeing to allow
- What rights the signing party is granting
- What obligations the signing party is accepting

3. Risk Identification
- Potential risks or downsides
- Unusual or concerning terms
- Hidden obligations
- Potential future impacts

4. Rights and Protections
- Rights granted to the signing party
- Protections provided
- Remedies available
- Exit or termination options

5. Plain Language Summary
- Clear, everyday language explanation
- Practical implications
- Key points to consider before signing
    """

    ADDITIONAL_INSTRUCTIONS = """
Additional Instructions:
- Focus on making complex legal concepts understandable to non-lawyers
- Highlight anything that seems unusual or potentially concerning
- Be thorough but clear - this will help someone make an informed decision
- If there are significant risks, make them prominent in your response
- Pay special attention to termination rights, obligations, and liability terms
- Look for any non-standard clauses that might need special attention
- Consider both immediate and long-term implications of the agreement
- Identify any clauses that might benefit from legal counsel review
    """

    OUTPUT_INSTRUCTIONS_ANALYSIS = """
Please provide your analysis in the following JSON structure:
{
    "key_commitments": [
        "List of main things being agreed to"
    ],
    "important_risks": [
        "List of potential risks or concerns"
    ],
    "plain_english_summary": "Clear explanation in everyday language",
    "unusual_terms": [
        "Any terms that seem unusual or deserve special attention"
    ],
    "recommended_actions": [
        "List of suggested steps or considerations before signing"
    ],
    "key_clauses": {
        "clause_name": "Plain English explanation"
    }
}
    """

    def __init__(
        self,
        openai_client: Optional[OpenAI],
        groq_client: Optional[Groq],
        config: GAgentConfig,
    ):
        """
        You can pass in one or both clients. The code will determine which one to use
        based on the model name and the config's 'prices' dictionary.
        """
        self.openai_client = openai_client
        self.groq_client = groq_client
        self.config = config

    def get_provider_for_model(self, model_name: str) -> str:
        """
        Determine whether this model belongs to 'openai' or 'groq'
        by looking in the config.prices dictionary.
        Raises ValueError if the model name is not found.
        """
        if (
            "openai" in self.config.prices
            and model_name in self.config.prices["openai"]
        ):
            return "openai"
        elif "groq" in self.config.prices and model_name in self.config.prices["groq"]:
            return "groq"
        else:
            raise ValueError(f"Model '{model_name}' not found in pricing dictionary.")

    def extract_json_as_dict(self, input_text: str) -> Dict[str, Any]:
        """
        Use the small_model from config, figure out which provider it belongs to,
        and call that provider's client to parse out JSON.
        """
        small_model_provider = self.get_provider_for_model(self.config.small_model)
        if small_model_provider == "openai":
            client = self.openai_client
        else:
            client = self.groq_client

        prompt = f"""
{self.SYSTEM_CONTEXT_EXTRACTION}

Input Text:
```
{input_text}
```

{self.OUTPUT_INSTRUCTIONS_EXTRACTION}
        """.strip()

        try:
            response = client.chat.completions.create(
                model=self.config.small_model,
                messages=[{"role": "user", "content": prompt}],
            )

            usage_info = getattr(response, "usage", None)
            if usage_info and hasattr(usage_info, "prompt_tokens"):
                token_usage = TokenUsage(
                    input=usage_info.prompt_tokens,
                    output=usage_info.completion_tokens,
                )
            else:
                token_usage = TokenUsage(input=0, output=0)

            extracted_json_text = (
                response.choices[0]
                .message.content.strip("```json")
                .strip("```")
                .strip()
            )

            extracted_json_dict = json.loads(extracted_json_text)

        except Exception as e:
            extracted_json_dict = {}
            token_usage = TokenUsage(input=0, output=0)
            return {
                "extracted_json": extracted_json_dict,
                "token_usage": token_usage,
                "error": f"Error during JSON extraction: {type(e).__name__}: {e}",
            }

        return {
            "extracted_json": extracted_json_dict,
            "token_usage": token_usage,
            "error": None,
        }

    def build_prompt(self, contract_text: str) -> str:
        context_vars = {
            "document_type": self.config.document_type or "Unknown",
            "specific_concerns": self.config.specific_concerns or "None specified",
        }

        context_section = "Context Variables:\n" + "\n".join(
            f"{k}: {v}" for k, v in context_vars.items()
        )

        # ===== STRONG INSTRUCTION TO OUTPUT JSON ONLY =====
        # We add a final line that demands valid JSON output, with no extra text.
        strict_json_instruction = """
!!!IMPORTANT!!!
YOU MUST PROVIDE YOUR FINAL ANALYSIS STRICTLY IN VALID JSON FORMAT.
DO NOT INCLUDE ANY EXTRANEOUS TEXT, HEADERS, OR EXPLANATIONS OUTSIDE THE JSON STRUCTURE.
FAILURE TO COMPLY WILL RESULT IN AN INVALID RESPONSE.
        """

        prompt = f"""
{self.SYSTEM_CONTEXT_ANALYSIS}

Document Under Review:
```
{contract_text}
```

{context_section}

{self.ANALYSIS_FRAMEWORK}

{self.OUTPUT_INSTRUCTIONS_ANALYSIS}

{self.ADDITIONAL_INSTRUCTIONS}

{strict_json_instruction}
        """.strip()

        return prompt

    def analyze_contract(self, contract_path: str) -> Dict[str, Any]:
        start_time = time.time()

        contract_content = load_file_content(contract_path)
        prompt = self.build_prompt(contract_text=contract_content)

        # Determine which provider to use for the big_model
        big_model_name = self.config.big_model
        provider_for_big_model = self.get_provider_for_model(big_model_name)

        big_model_tokens = TokenUsage(input=0, output=0)
        small_model_tokens = TokenUsage(input=0, output=0)
        extracted_dict = {}
        extraction_error = None

        try:
            if provider_for_big_model == "openai":
                response = self.openai_client.chat.completions.create(
                    model=big_model_name,
                    messages=[{"role": "user", "content": prompt}],
                    stream=False,
                )
                usage_info = getattr(response, "usage", None)
                if usage_info and hasattr(usage_info, "prompt_tokens"):
                    big_model_tokens = TokenUsage(
                        input=usage_info.prompt_tokens,
                        output=usage_info.completion_tokens,
                    )
                analysis_text = response.choices[0].message.content

            else:
                # provider is groq
                response = self.groq_client.chat.completions.create(
                    model=big_model_name,
                    messages=[{"role": "user", "content": prompt}],
                )
                usage_info = getattr(response, "usage", None)
                if usage_info and hasattr(usage_info, "prompt_tokens"):
                    big_model_tokens = TokenUsage(
                        input=usage_info.prompt_tokens,
                        output=usage_info.completion_tokens,
                    )
                analysis_text = response.choices[0].message.content

            # Now that we have `analysis_text`, let's extract the JSON from it
            extraction_result = self.extract_json_as_dict(analysis_text)
            extracted_dict = extraction_result["extracted_json"]
            small_model_tokens = extraction_result["token_usage"]
            extraction_error = extraction_result["error"]

        except Exception as e:
            extraction_error = (
                f"Error during contract analysis: {type(e).__name__}: {e}"
            )

        runtime = time.time() - start_time

        output = {
            "params": {
                "contract_path": contract_path,
                "big_model": big_model_name,
                "small_model": self.config.small_model,
                "document_type": self.config.document_type,
                "specific_concerns": self.config.specific_concerns,
            },
            "contract_content": contract_content,
            "report": extracted_dict,
            "token_count": {
                "big_model": big_model_tokens.model_dump(),
                "small_model": small_model_tokens.model_dump(),
            },
            "runtime_seconds": runtime,
            "error": extraction_error,
        }

        if self.config.last_cost_values_set_date:
            try:
                # Determine providers for cost calculation
                provider_for_small_model = self.get_provider_for_model(
                    self.config.small_model
                )

                # Big model cost
                big_input_cost = self.config.prices[provider_for_big_model][
                    big_model_name
                ]["input"]
                big_output_cost = self.config.prices[provider_for_big_model][
                    big_model_name
                ]["output"]
                big_model_total_cost = (
                    big_model_tokens.input / 1_000_000
                ) * big_input_cost + (
                    big_model_tokens.output / 1_000_000
                ) * big_output_cost

                # Small model cost
                small_input_cost = self.config.prices[provider_for_small_model][
                    self.config.small_model
                ]["input"]
                small_output_cost = self.config.prices[provider_for_small_model][
                    self.config.small_model
                ]["output"]
                small_model_total_cost = (
                    small_model_tokens.input / 1_000_000
                ) * small_input_cost + (
                    small_model_tokens.output / 1_000_000
                ) * small_output_cost

                total_cost = big_model_total_cost + small_model_total_cost

                output["estimated_cost"] = EstimatedCost(
                    last_set=self.config.last_cost_values_set_date,
                    big_model_cost_dollars=big_model_total_cost,
                    small_model_cost_dollars=small_model_total_cost,
                    total_cost_dollars=total_cost,
                ).model_dump()

            except KeyError as key_err:
                output["estimated_cost_error"] = (
                    f"Pricing dictionary missing key: {key_err}"
                )
            except Exception as e:
                output["estimated_cost_error"] = (
                    f"Error calculating estimated costs: {type(e).__name__}: {e}"
                )

        return output

    def run(self, contract_path: str) -> Dict[str, Any]:
        return self.analyze_contract(contract_path)


# NOTE: this code is only used for demonstration/testing.
if __name__ == "__main__":
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

    prices = {
        "openai": {
            "gpt-4o": {"input": 2.5, "output": 10},
            "gpt-4o-mini": {"input": 0.15, "output": 0.6},
            "o1": {"input": 15, "output": 60},
            "o1-preview": {"input": 15, "output": 60},
            "o1-mini": {"input": 3, "output": 12},
        },
        "groq": {"deepseek-r1-distill-llama-70b": {"input": 0.75, "output": 0.99}},
    }

    config = GAgentConfig(
        big_model="deepseek-r1-distill-llama-70b",
        small_model="gpt-4o-mini",
        document_type="UNKNOWN",
        specific_concerns="UNKNOWN",
        last_cost_values_set_date="January 20, 2025",
        prices=prices,
    )

    agent = GAgent(openai_client=openai_client, groq_client=groq_client, config=config)

    output = agent.run(contract_path="../assets/contracts/example.pdf")

    del output["contract_content"]

    print(json.dumps(output, indent=4))
