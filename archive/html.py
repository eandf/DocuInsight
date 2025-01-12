def generate_iframe_html(url):
    html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Iframe Example</title>
    <style>
        html, body {{
            margin: 0;
            height: 100%;
        }}
        iframe {{
            width: 100%;
            height: 100%;
            border: 5px solid limegreen; /* Bright green border */
            box-sizing: border-box; /* Ensures border is included in dimensions */
        }}
    </style>
</head>
<body>
    <iframe src="{url}">
        Your browser does not support iframes.
    </iframe>
</body>
</html>
"""
    return html_template
