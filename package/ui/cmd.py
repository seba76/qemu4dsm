#!/usr/bin/python
import json
from config import JSON_STORE
from app.script_gen import generate_script, remove_script, call_script, is_authenticated, is_running

with open(JSON_STORE) as data_file:    
    data = json.load(data_file)

for vm in data['virtualmachine']:
    generate_script(vm['id'])
        
