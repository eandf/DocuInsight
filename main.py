# Written by Mehmet Yilmaz on January 12, 2025

import base64
import json
import os


def load_json(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)
        return data


def extract_geo_location(glf_value_input):
    usa_states_and_cities = load_json("./usa_states_and_cities.json")
    glf_value = None
    for state in usa_states_and_cities:
        if glf_value_input.lower() == state.lower():
            glf_value = f"{state}, U.S.A."
            break
    if glf_value == None:
        input_city = None
        input_state_pov = None
        if "," in glf_value_input:
            sv = glf_value_input.replace(" ", "").split(",")
            if len(sv) == 2:
                input_city = sv[0]
                input_state_pov = sv[1]
        for state in usa_states_and_cities:
            state_pov = usa_states_and_cities[state]["shorten"]
            cities = usa_states_and_cities[state]["cities"]
            for city in cities:
                if glf_value_input.lower() == city.lower():
                    glf_value = f"{city}, {state_pov}"
                    break
                if input_city != None and input_state_pov != None:
                    if (
                        str(input_city).lower() == city.lower()
                        and str(input_state_pov).lower() == state_pov.lower()
                    ):
                        glf_value = f"{city}, {state_pov}"
                        break
            if glf_value != None:
                break
    return glf_value


def extract_area_of_interest(user_input):
    areas_of_practice = load_json("./areas_of_practice.json")
    for area in areas_of_practice:
        if user_input.lower() == area.lower():
            return area
    return None


# main function calls

term = input("Term: ")

glf_value = extract_geo_location(input("Geolocation: "))
area_interest = extract_area_of_interest(input("Area Of Interest: "))

params = {"type": "people", "page": 1, "limit": 100, "prOverallScore": ["4to5"]}

if glf_value != None:
    params["geoLocationFacet"] = [glf_value]
if area_interest != None:
    params["practiceAreas"] = [area_interest]
if len(term) > 0:
    params["term"] = term

json_data = json.dumps(params)
encoded_params = base64.b64encode(json_data.encode()).decode()
url = f"https://www.martindale.com/search/attorneys/?params={encoded_params}"

try:
    os.system(f"open {url}")
except:
    pass

print("PARAMETERS:")
print(json.dumps(params, indent=4))
print("URL:")
print(url)
