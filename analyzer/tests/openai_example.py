from openai import OpenAI
import time
import os

client = OpenAI()

user_input = input("PROMPT: ")

stream_it = input("STREAM (y/n)? ")
if stream_it.lower() == "y":
    stream_it = True
else:
    stream_it = False

start_time = time.time()

model_name = "gpt-4o-mini"

response = client.chat.completions.create(
    model=model_name,
    messages=[{"role": "user", "content": user_input}],
    stream=stream_it,
)

print("RESPONSES:")
text = ""
if stream_it:
    for chunk in response:
        if chunk.choices[0].delta.content is not None:
            text = chunk.choices[0].delta.content
            print(text, end="", flush=True)
else:
    text = response.choices[0].message.content
    print(text)

runtime = time.time() - start_time

print(f"RUNTIME: {runtime} seconds")
