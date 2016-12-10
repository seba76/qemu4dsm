import logging
import json
import os
from flask import render_template, flash, redirect, request, jsonify, make_response, send_from_directory, send_file
from app import app
from config import JSON_STORE, BASEDIR
from app.script_gen import generate_script, remove_script, call_script, is_authenticated, is_running, get_scr_file, exec_create_disk

#log = logging.getLogger() 
log = logging.getLogger(__name__)

@app.route('/VirtualMachine', methods=['GET', 'POST', 'PUT', 'DELETE'])
def vm():
    dc = request.args.get('_dc')
    if is_authenticated() == False:
        return redirect("/", code=401)

    if request.method == 'GET':
        with open(JSON_STORE) as data_file:    
            data = json.load(data_file)

        for vm in data['virtualmachine']:
            vm['running'] = is_running(vm['id'])

        response = make_response(jsonify(data))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    if request.method == 'POST':
        n = request.get_json()
        with open(JSON_STORE) as data_file:    
            data = json.load(data_file)

        updated = json.loads('{ "virtualmachine": [] }')
        for vm in data['virtualmachine']:
            if vm['id'] == n['virtualmachine']['id']:
                updated['virtualmachine'].append(n['virtualmachine'])
            else:
                updated['virtualmachine'].append(vm)

        with open(JSON_STORE, 'w') as f:
            json.dump(updated, f, sort_keys=True, indent=4, separators=(',', ': '))
        
        generate_script(n['virtualmachine']['id'])
        n['virtualmachine']['running'] = is_running(n['virtualmachine']['id'])
        response = make_response(jsonify(n))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    if request.method == 'PUT':
        n = request.get_json()
        with open(JSON_STORE) as data_file:    
            data = json.load(data_file)

        lastId = 0
        for vm in data['virtualmachine']:
            lastId = int(vm['id'])
        
        n['virtualmachine']['id'] = str(lastId + 1)
        data['virtualmachine'].append(n['virtualmachine'])

        with open(JSON_STORE, 'w') as f:
            json.dump(data, f, sort_keys=True, indent=4, separators=(',', ': '))

        generate_script(n['virtualmachine']['id'])
        n['virtualmachine']['running'] = is_running(n['virtualmachine']['id'])
        response = make_response(jsonify(n))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    if request.method == 'DELETE':
        n = request.get_json()
        with open(JSON_STORE) as data_file:    
            data = json.load(data_file)

        updated = json.loads('{ "virtualmachine": [] }')
        for vm in data['virtualmachine']:
            if vm['id'] != n['virtualmachine']['id']:
                updated['virtualmachine'].append(vm)

        with open(JSON_STORE, 'w') as f:
            json.dump(updated, f, sort_keys=True, indent=4, separators=(',', ': '))

        running = is_running(n['virtualmachine']['id'])
        if running:
            vmstop(n['virtualmachine']['id'])

        n['virtualmachine']['running'] = running
        remove_script(n['virtualmachine']['id'])
        response = make_response(jsonify(n))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

@app.route('/VmStart/<id>', methods=['GET'])
def vmstart(id):
    dc = request.args.get('_dc')
    if is_authenticated() == False:
        return redirect("/", code=401)

    if request.method == 'GET':
        code = call_script(id, "start")
        if code == 0:
            log.debug('VM {0} started success'.format(id))
            response = make_response('{{ "message": "Success", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        else:
            log.debug('VM {0} start failed'.format(id))
            response = make_response('{{ "message": "Error", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response

@app.route('/VmShutdown/<id>', methods=['GET'])
def vmshutdown(id):
    dc = request.args.get('_dc')
    if is_authenticated() == False:
        return redirect("/", code=401)

    if request.method == 'GET':
        code = call_script(id, "stop")
        if code == 0:
            log.debug('VM {0} shutdown success'.format(id))
            response = make_response('{{ "message": "Success", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        else:
            log.debug('VM {0} shutdown failed'.format(id))
            response = make_response('{{ "message": "Error", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response

@app.route('/VmStop/<id>', methods=['GET'])
def vmstop(id):
    dc = request.args.get('_dc')
    if is_authenticated() == False:
        return redirect("/", code=401)

    if request.method == 'GET':
        code = call_script(id, "force-stop")
        if code == 0:
            log.debug('VM {0} terminate success'.format(id))
            response = make_response('{{ "message": "Success", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        else:
            log.debug('VM {0} terminate failed'.format(id))
            response = make_response('{{ "message": "Error", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response

@app.route('/VmPause/<id>', methods=['GET'])
def vmpause(id):
    dc = request.args.get('_dc')
    if is_authenticated() == False:
        return redirect("/", code=401)

    if request.method == 'OPTIONS':
        return make_response('')

    if request.method == 'GET':
        code = call_script(id, "pause")
        if code == 0:
            log.debug('VM {0} pause success'.format(id))
            response = make_response('{{ "message": "Success", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        else:
            log.debug('VM {0} pause failed'.format(id))
            response = make_response('{{ "message": "Error", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response

@app.route('/VmReset/<id>', methods=['GET'])
def vmreset(id):
    dc = request.args.get('_dc')
    if is_authenticated() == False:
        return redirect("/", code=401)

    if request.method == 'GET':
        code = call_script(id, "reset")
        if code == 0:
            log.debug('VM {0} reset success'.format(id))
            response = make_response('{{ "message": "Success", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        else:
            log.debug('VM {0} reset failed'.format(id))
            response = make_response('{{ "message": "Error", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response

@app.route('/VmImage/<id>', methods=['GET'])
def vmimage(id):
    dc = request.args.get('_dc')
    if is_authenticated() == False:
        return redirect("/", code=401)

    if request.method == 'GET':
        code = call_script(id, "take-screenshot")
        if code == 0:
            return send_file(get_scr_file(id))
        else:
            return send_file(os.path.join(BASEDIR, 'images/404.jpg'))

@app.route('/CreateDisk', methods=['PUT'])
def disk_create():
    dc = request.args.get('_dc')
    if is_authenticated() == False:
        return redirect("/", code=401)

    if request.method == 'PUT':
        n = request.get_json()
        param = n["createdisk"]
        code = exec_create_disk(param["filename"], param["fmt"], param["size"], param["options"])
        if code == 0:
            log.debug('Image create success')
            response = make_response('{{ "message": "Success", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        else:
            log.debug('Image create failed')
            response = make_response('{{ "message": "Error", "code": {0} }}'.format(code))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            response.status_code = 406
            return response
