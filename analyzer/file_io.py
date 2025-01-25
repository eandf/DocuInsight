from docx import Document
from PIL import Image
import pytesseract
import openpyxl
import chardet
import base64
import fitz
import json
import re
import os


def load_json(path):
    with open(str(path)) as file:
        content = json.load(file)
    return content


def load_text(file_path):
    with open(file_path, "rb") as file:
        raw_data = file.read()
        result = chardet.detect(raw_data)
        encoding = result["encoding"]

    with open(file_path, "r", encoding=encoding, errors="replace") as file:
        return file.read()


def load_image(file_path, client, model_name="gpt-4o", prompt=None, text_mode=False):
    with open(file_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode("utf-8")

    chat_history = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                }
            ],
        }
    ]

    if isinstance(prompt, str):
        chat_history.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(model=model_name, messages=chat_history)
    models_response = response.choices[0].message.content

    image = Image.open(file_path)
    text = pytesseract.image_to_string(image)
    text = "\n".join(line for line in text.splitlines() if line.strip())

    if text_mode == False:
        return {"response": models_response, "pytesseract": text}
    else:
        return (
            "The following image was reviewed:\n"
            "```\n"
            f"{file_path}\n"
            "```\n\n"
            f"With the following task/prompt provided to the '{model_name}' model:\n"
            "```\n"
            f"{prompt}\n"
            "```\n\n"
            "Given this, the model describes the image in the following way:\n"
            "```\n"
            f"{models_response}\n"
            "```\n\n"
            "Also, `pytesseract` was used to try and extract text from the image and the following text was extracted:\n"
            "```\n"
            f"{text}\n"
            "```\n"
        )


def load_pdf(file_path):
    document = fitz.open(file_path)
    text = ""
    for page_num in range(document.page_count):
        page = document[page_num]
        text += page.get_text()
    document.close()
    return text


def load_docx(file_path):
    doc = Document(file_path)
    return "\n".join([paragraph.text for paragraph in doc.paragraphs])


def load_xlsx(file_path):
    workbook = openpyxl.load_workbook(file_path, data_only=True)
    text = ""
    for sheet in workbook:
        text += f"Sheet: {sheet.title}\n"
        consecutive_empty_rows = 0
        for row in sheet.iter_rows(values_only=True):
            formatted_row = "\t".join(
                [str(cell).strip() if cell is not None else "" for cell in row]
            )
            if all(cell == "" for cell in formatted_row.split("\t")):
                consecutive_empty_rows += 1
            else:
                if consecutive_empty_rows > 0:
                    text += "\t\n"
                    consecutive_empty_rows = 0
                text += formatted_row + "\n"
        if consecutive_empty_rows > 0:
            text += "\t\n"
    text = text.strip()
    return text


def get_directory_structure(root_dir):
    directory_structure = {}
    total_files = 0
    total_directories = 0

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # filter out directories that are './', '../', or start with an underscore
        dirnames[:] = [
            d for d in dirnames if not d.startswith("_") and d not in (".", "..")
        ]

        # create a list of file paths, ignoring hidden files
        file_paths = [
            os.path.join(dirpath, filename)
            for filename in filenames
            if not filename.startswith(".")
        ]

        # count the number of non-hidden directories
        total_directories += len(dirnames)

        # count the number of non-hidden files
        total_files += len(file_paths)

        # only add directories with files that are not hidden
        if file_paths:
            directory_structure[dirpath] = file_paths

    return directory_structure, total_files, total_directories


def load_file_content(file_path, client=None):
    file_content = None
    if file_path.lower().endswith(".pdf"):
        file_content = load_pdf(file_path)
        file_content = re.sub(r"\n\s+\n", "\n\n", file_content)
        file_content = re.sub(r"\n{2,}", "\n\n", file_content)
    elif file_path.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff")):
        file_content = load_image(
            file_path=file_path,
            client=client,
            model_name="gpt-4o",
            prompt="Given the following image, describe it's details/features as much as you can",
            text_mode=True,
        )
    elif file_path.lower().endswith((".doc", ".docx")):
        file_content = load_docx(file_path)
    elif file_path.lower().endswith((".xls", ".xlsx", ".ods")):
        file_content = load_xlsx(file_path)
    elif file_path.lower().endswith(".json"):
        file_content = load_json(file_path)
    else:
        file_content = load_text(file_path)
    return file_content
