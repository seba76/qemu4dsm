import logging
import sys
import json
import os
import subprocess
from config import JSON_STORE, BASEDIR

#log = logging.getLogger() 
log = logging.getLogger(__name__)

script = '''#!/bin/sh
SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")
PATH=$PATH:/opt/qemu/bin
SOCKET=/var/run/qemu-vm{0}.qmp
PIDFILE=/var/run/qemu-vm{0}.pid
VMNAME={2}

. ${{SCRIPTPATH}}/vm-helpers.sh

start () {{
  {1}
}}

case "$1" in
start)
    [ -S $SOCKET ] && echo "VM is running!" && exit 2
    start
    ;;
stop)
    [ ! -S $SOCKET ] && echo "VM is stopped!" && exit 3
    stop $SOCKET
	cleanup $VMNAME
    ;;
status)
    status $SOCKET
    ;;
shell)
	shell $SOCKET
	;;
force-stop)
    force_stop $SOCKET
	cleanup $VMNAME
    ;;
take-screenshot)
    take_screenshot $SOCKET $VMNAME
	;;
init)
	init tap{0}
	;;
*)
    echo "Usage: $0 (start|stop|status|shell|force-stop|init|take-screenshot)"
    exit 1
    ;;
esac

exit 0
'''

def create_qemu_cmd(vm):
    cmd = None
    if vm['net1type'] == 'bridge':
        cmd = 'init tap{0}\n  '.format(vm['id'])
    else:
        cmd = 'init\n  '

    cmd += '''qemu-system-x86_64  \\
    -machine {0} \\
    -m {1} \\
    -vnc 0.0.0.0:{2} \\
    -enable-kvm \\
    -vga {3} \\
    -nographic \\
    -name '{4}' \\
    -smp {5} \\
    -chardev socket,id=qmp,path=$SOCKET,server,nowait \\
    -mon chardev=qmp,mode=control \\
    -pidfile $PIDFILE \\
'''
    cmd = cmd.format(vm['machine'], vm['memory'], vm['vnc'], vm['vga'], vm['name'], vm['smp'])

    if vm['mouse'] == 'usb':
        cmd += '    -usbdevice mouse \\\n'
    elif vm['mouse'] == 'tablet':
        cmd += '    -usbdevice tablet \\\n'
    if vm['bootMenuOn'] == True:
        cmd += '    -boot menu=on \\\n'
    if vm['net1type'] == 'nat':
        cmd += '    -net nic,netdev=id,macaddr={0} \\\n'.format(vm['net1mac'])
        cmd += '    -netdev user,id=id,net={0},dhcpstart={1} \\\n'.format(vm['net1dhcp'], vm['net1dhcpstart'])
    elif vm['net1type'] == 'bridge':
        cmd += '    -net nic,netdev=id,macaddr={0} \\\n'.format(vm['net1mac'])
        cmd += '    -netdev tap,id=id,ifname=tap{0},script=no,downscript=no \\\n'.format(vm['id'])
        
    if vm['hda'] != None and len(vm['hda']) > 0:
        cmd += '    -hda {0} \\\n'.format(vm['hda'])
    if vm['hdb'] != None and len(vm['hdb']):
        cmd += '    -hdb {0} \\\n'.format(vm['hdb'])
    if vm['hdc'] != None and len(vm['hdc']):
        cmd += '    -hdc {0} \\\n'.format(vm['hdc'])
    if vm['hdd'] != None and len(vm['hdd']):
        cmd += '    -hdd {0} \\\n'.format(vm['hdd'])
    if vm['extra'] != None and len(vm['extra']):
        cmd += '    {0} \\\n'.format(vm['extra'])

    cmd += '    &'
    return cmd

def generate_script(id):
    with open(JSON_STORE) as data_file:    
        data = json.load(data_file)
        
    selectedVm = None
    for vm in data['virtualmachine']:
        if vm['id'] == id:
            selectedVm = vm
            break

    if selectedVm is not None:
        qemuLine = create_qemu_cmd(selectedVm)
        scr = script.format(selectedVm['id'], qemuLine, selectedVm['name'])
        name = 'run-{0}.sh'.format(selectedVm['name'])
        with open(name, 'w') as f:
            f.write(scr)
        subprocess.call(['chmod', '755', name])
        return True
    
    return False

def remove_script(id):
    try:
        script = get_script_name(id)
        if script != None:
			os.remove(script)            
    except:
        log.error("Unexpected error: {0}".format(sys.exc_info()[0]))
        pass

def get_script_name(id):
    with open(JSON_STORE) as data_file:    
        data = json.load(data_file)
        
    selectedVm = None
    for vm in data['virtualmachine']:
        if vm['id'] == id:
            selectedVm = vm
            break

    if selectedVm is not None:
        return 'run-{0}.sh'.format(selectedVm["name"])

    return None

def get_scr_file(id):
    with open(JSON_STORE) as data_file:    
        data = json.load(data_file)
        
    selectedVm = None
    for vm in data['virtualmachine']:
        if vm['id'] == id:
            selectedVm = vm
            break

    if selectedVm is not None:
        return os.path.join(BASEDIR, '{0}.jpg'.format(selectedVm["name"]))

    return None


def call_script(id, cmd):
    try:
        script = get_script_name(id)
        if script != None:
            return subprocess.call([os.path.join(BASEDIR, script), cmd])
    except:
        log.error("Unexpected error: {0}".format(sys.exc_info()[0]))
        pass
        return -9

def is_authenticated():
    try:
        user = subprocess.check_output("/usr/syno/synoman/webman/modules/authenticate.cgi")
        if (user != None and len(user) > 0):
            return True
    except:
        log.error("Unexpected error: {0}".format(sys.exc_info()[0]))
        pass

    return False

def is_running(id):
    try:
        cmd = "ps aux | grep qemu-vm{0}.qmp -c".format(id)
        nr = int(subprocess.check_output(cmd, shell=True)) - 2
        if (nr > 0):
            return True
    except:
        log.error("Unexpected error: {0}".format(sys.exc_info()[0]))
        pass

    return False

def exec_create_disk(filename, fmt, size, options):
    try:
        # qemu-img create [-f fmt] [-o options] filename [size]
        my_env = os.environ.copy()
        my_env["PATH"] = "/opt/qemu/bin:" + my_env["PATH"]
        abs_path = os.path.abspath(filename)
        if abs_path.startswith('/volume') == False:
            log.error("Disk create: path doesn't start with /volume")
            return -1
        if len(options) > 0:
            log.debug("Disk create: -f {0} -o {1} {2} {3}".format(fmt, options, abs_path, size))
            code = subprocess.call(['/opt/qemu/bin/qemu-img', 'create', '-f', fmt, '-o', options, abs_path, size], env=my_env)
        else:
            log.debug("Disk create: -f {0} {1} {2}".format(fmt, abs_path, size))
            code = subprocess.call(['/opt/qemu/bin/qemu-img', 'create', '-f', fmt, abs_path, size], env=my_env)
        
        return code
    except:
        log.error("Unexpected error: {0}".format(sys.exc_info()[0]))
        pass

    return False
