function genMAC() {
    var hexDigits = "0123456789ABCDEF";
    var macAddress = "";
    for (var i = 0; i < 6; i++) {
        macAddress += hexDigits.charAt(Math.round(Math.random() * 15));
        macAddress += hexDigits.charAt(Math.round(Math.random() * 15));
        if (i != 5) macAddress += ":";
    }

    return macAddress;
}

Ext.define('qemuApp.model.VirtualMachine', {
    extend: 'qemuApp.model.Base',
    fields: [
        { name: 'name' },
        { name: 'location' },
        { name: 'description' },
        { name: 'running', type: 'boolean', defaultValue: false },
        { name: 'machine', type: 'string', defaultValue: 'pc' },
        { name: 'memory', type: 'int', defaultValue: 256 },
        { name: 'vnc', type: 'int', defaultValue: 0 },
        { name: 'vga', type: 'string', defaultValue: 'std' },
        { name: 'keyboard', type: 'string', defaultValue: 'ps2' },
        { name: 'mouse', type: 'string', defaultValue: 'ps2' },
        { name: 'bootMenuOn', type: 'boolean' },
        { name: 'smp', type: 'int', defaultValue: 1 },
        { name: 'net1type', type: 'string', defaultValue: 'none' },
        { name: 'net1model', type: 'string', defaultValue: 'e1000' },
        { name: 'net1mac', type: 'string', defaultValue: null },
        { name: 'net1bridge', type: 'string', defaultValue: 'eth0' },
        { name: 'net1dhcp', type: 'string' },
        { name: 'net1dhcpstart', type: 'string' },
        { name: 'net2type', type: 'string', defaultValue: 'none' },
        { name: 'net2model', type: 'string', defaultValue: 'none' },
        { name: 'net2mac', type: 'string', defaultValue: null },
        { name: 'net2bridge', type: 'string', defaultValue: 'eth0' },
        { name: 'net2dhcp', type: 'string' },
        { name: 'net2dhcpstart', type: 'string' },
        { name: 'hda', type: 'string' },
        { name: 'hdb', type: 'string' },
        { name: 'hdc', type: 'string' },
        { name: 'hdd', type: 'string' },
        { name: 'extra', type: 'string' },
    ],

    constructor: function () {
        this.callParent(arguments);
        if (this.get('net1mac') == null) this.set('net1mac', genMAC());
        if (this.get('net2mac') == null) this.set('net2mac', genMAC());
    }
});
