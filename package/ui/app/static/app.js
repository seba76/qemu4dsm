// click and itsdangerus required
// config.js    -> var URL_BASE = '/webman/3rdparty/qemu4dsm/api.cgi';

var SynoToken = 'DummyToken';

Ext.Ajax.request({
    url: '/webman/login.cgi',
    useDefaultXhrHeader: true,

    success: function (response, opts) {
        var login = Ext.JSON.decode(response.responseText);
        SynoToken = login.SynoToken;
        Ext.Ajax.setDefaultHeaders({
            "X-SYNO-TOKEN": SynoToken
        });

        start();
    },

    failure: function (response, opts) {
        console.log('Error loading SynoToken!');
        //error('Error loading SynoToken!<br /><code>' + response.responseText + '</code>');
        start();
    }
});

var vmStore = Ext.create('Ext.data.Store', {
    model: 'qemuApp.model.VirtualMachine',
});

//Ext.TaskManager.start({
//    run: function () {
//        vmStore.load();
//    },
//    interval: 10000
//});

function ElementDisable(form, status) {

    if (status == true) {
        form.items.each(function (item) {
            var type = item.getXType()
            if (type == 'textfield' || type == 'combo' || type == 'combobox' || type == 'checkbox' ||
                type == 'textarea' || type == 'numberfield' || type == 'checkboxfield' ||
                type == 'datefield') {
                //Disable the item
                item.disable();
            }
            else if (type == 'panel') {
                ElementDisable(item, status);
            }
        });
    } else {
        form.items.each(function (item) {
            var type = item.getXType()
            if (type == 'textfield' || type == 'combo' || type == 'combobox' || type == 'checkbox' ||
                type == 'textarea' || type == 'numberfield' || type == 'checkboxfield' ||
                type == 'datefield') {
                //enable the item
                item.enable();
            }
            else if (type == 'panel') {
                ElementDisable(item, status);
            }
        });
    }
}

function ButtonsDisable(form, start, stop, term, reset) {
    var bt = form.queryById('bt_play');
    if (bt != null && start != null) {
        bt.setDisabled(start);
    }

    var bt = form.queryById('bt_stop');
    if (bt != null && stop != null) {
        bt.setDisabled(stop);
    }
    var bt = form.queryById('bt_terminate');
    if (bt != null && term != null) {
        bt.setDisabled(term);
    }
    var bt = form.queryById('bt_undo');
    if (bt != null && reset != null) {
        bt.setDisabled(reset);
    }
}

function create_vm_form(eOpts) {
    var form = Ext.create('Ext.form.Panel', {
        autoScroll: true,
        title: eOpts.data.name,
        closable: true,
        fullscreen: true,
        defaults: {
            layout: 'form',
        },
        itemId: 'vm' + eOpts.data.id,
        items: [
            {
                xtype: 'toolbar',
                docked: 'top',
                height: 30,
                itemId: 'toolbar',
                items: [
                    {
                        xtype: 'button',
                        itemId: 'bt_save',
                        iconCls: 'x-fa fa-save',
                        text: 'Save',
                        disabled: true,
                        handler: function () {
                            var form = this.up('form'); // get the basic form
                            var record = form.getRecord(); // get the underlying model instance
                            var bt = this;
                            if (form.isValid()) { // make sure the form contains valid data before submitting
                                form.updateRecord(record); // update the record with the form data
                                form.setTitle(eOpts.data.name);
                                record.save({ // save the record to the server
                                    success: function (rec) {
                                        Ext.Msg.alert('Success', 'Configuration saved successfully.')
                                        form.loadRecord(rec);
                                        bt.setDisabled(true);
                                    },
                                    failure: function (rec) {
                                        Ext.Msg.alert('Failure', 'Failed to save configuration!')
                                    }
                                });
                            } else { // display error alert if the data is invalid
                                Ext.Msg.alert('Invalid Data', 'Please correct form errors.')
                            }
                        }
                    }, {
                        xtype: 'button',
                        itemId: 'bt_play',
                        iconCls: 'x-fa fa-play',
                        text: 'Start',
                        handler: function () {
                            var form = this.up('form');
                            var sel = form.getRecord();
                            if (sel != null) {
                                var id = sel['id'];
                                Ext.Ajax.request({
                                    url: URL_BASE + '/VmStart/' + id,
                                    useDefaultXhrHeader: true,
                                    success: function (response, opts) {
                                        ElementDisable(form, true);
                                        ButtonsDisable(form, true, false, false, false);
                                        Ext.Msg.alert('Success', 'VM started!')
                                    },
                                    failure: function (response, opts) {
                                        Ext.Msg.alert('Failure', 'Failed to Start VM!')
                                    }
                                });
                            }
                        }
                    }, {
                        xtype: 'button',
                        itemId: 'bt_stop',
                        iconCls: 'x-fa fa-stop',
                        text: 'Shutdown',
                        disabled: true,
                        handler: function () {
                            var form = this.up('form');
                            var sel = form.getRecord();
                            if (sel != null) {
                                var id = sel['id'];
                                Ext.Ajax.request({
                                    url: URL_BASE + '/VmShutdown/' + id,

                                    success: function (response, opts) {
                                        //var obj = Ext.decode(response.responseText);
                                        ElementDisable(form, false);
                                        ButtonsDisable(form, false, true, true, true);
                                        Ext.Msg.alert('Success', 'VM stoped!')
                                    },

                                    failure: function (response, opts) {
                                        Ext.Msg.alert('Failure', 'Failed to Stop VM!')
                                    }
                                });
                            }
                        }
                    }, {
                        xtype: 'button',
                        itemId: 'bt_terminate',
                        iconCls: 'x-fa fa-stop',
                        text: 'Terminate',
                        disabled: true,
                        handler: function () {
                            var form = this.up('form');
                            var sel = form.getRecord();
                            if (sel != null) {
                                var id = sel['id'];
                                Ext.Ajax.request({
                                    url: URL_BASE + '/VmStop/' + id,

                                    success: function (response, opts) {
                                        //var obj = Ext.decode(response.responseText);
                                        ElementDisable(form, false);
                                        ButtonsDisable(form, false, true, true, true);
                                        Ext.Msg.alert('Success', 'VM terminated!')
                                    },

                                    failure: function (response, opts) {
                                        Ext.Msg.alert('Failure', 'Failed to Terminate VM!')
                                    }
                                });
                            }
                        }
                    }, {
                        xtype: 'button',
                        itemId: 'bt_undo',
                        iconCls: 'x-fa fa-undo',
                        text: 'Reset',
                        disabled: true,
                        handler: function () {
                            var form = this.up('form');
                            var sel = form.getRecord();
                            if (sel != null) {
                                var id = sel['id'];
                                Ext.Ajax.request({
                                    url: URL_BASE + '/VmReset/' + id,

                                    success: function (response, opts) {
                                        //var obj = Ext.decode(response.responseText);
                                        ButtonsDisable(form, true, false, false, false);
                                        Ext.Msg.alert('Success', 'VM restarted!')
                                    },

                                    failure: function (response, opts) {
                                        Ext.Msg.alert('Failure', 'Failed to Reset VM!')
                                    }
                                });
                            }
                        }
                    }
                ]
            },
            {
                xtype: 'panel',
                collapsible: true,
                title: 'General',
                defaults: {
                    listeners: {
                        change: function (field, newVal, oldVal) {
                            var tabPanel = Ext.getCmp('tabPanel');
                            var panel = tabPanel.queryById('vm' + eOpts.data.id);
                            if (panel != null) {
                                var bt = panel.queryById('bt_save');
                                if (bt != null) {
                                    bt.setDisabled(false);
                                }
                            }
                        }
                    },
                },
                items: [
                    {
                        xtype: 'textfield',
                        name: 'name',
                        fieldLabel: 'Name'
                    },
                    {
                        xtype: 'textfield',
                        name: 'description',
                        fieldLabel: 'Description',
                    }
                ]
            },
            {
                xtype: 'panel',
                collapsible: true,
                title: 'Basic',
                defaults: {
                    listeners: {
                        change: function (field, newVal, oldVal) {
                            var tabPanel = Ext.getCmp('tabPanel');
                            var panel = tabPanel.queryById('vm' + eOpts.data.id);
                            if (panel != null) {
                                var bt = panel.queryById('bt_save');
                                if (bt != null) {
                                    bt.setDisabled(false);
                                }
                            }
                        }
                    },
                },
                items: [
                    {
                        xtype: 'textfield',
                        name: 'machine',
                        fieldLabel: 'Machine'
                    },
                    {
                        xtype: 'textfield',
                        name: 'memory',
                        fieldLabel: 'Memory (MB)',
                    },
                    {
                        xtype: 'combobox',
                        name: 'keyboard',
                        fieldLabel: 'Keyboard',
                        displayField: 'text',
                        valueField: 'value',
                        store: {
                            fields: ['text', 'value'],
                            data: [
                                { text: 'PS/2', value: 'ps2' },
                                { text: 'USB', value: 'usb' },
                            ]
                        }
                    },
                    {
                        xtype: 'combobox',
                        name: 'mouse',
                        fieldLabel: 'Mouse',
                        displayField: 'text',
                        valueField: 'value',
                        store: {
                            fields: ['text', 'value'],
                            data: [
                                { text: 'PS/2', value: 'ps2' },
                                { text: 'USB', value: 'usb' },
                                { text: 'Tablet', value: 'tablet' },
                            ]
                        }
                    },
                ]
            },
            {
                xtype: 'panel',
                collapsible: true,
                title: 'Display',
                defaults: {
                    listeners: {
                        change: function (field, newVal, oldVal) {
                            var tabPanel = Ext.getCmp('tabPanel');
                            var panel = tabPanel.queryById('vm' + eOpts.data.id);
                            if (panel != null) {
                                var bt = panel.queryById('bt_save');
                                if (bt != null) {
                                    bt.setDisabled(false);
                                }
                            }
                        }
                    },
                },
                items: [
                    {
                        xtype: 'textfield',
                        name: 'vnc',
                        fieldLabel: 'VNC Port (5900 + p)'
                    },
                    {
                        xtype: 'combobox',
                        name: 'vga',
                        fieldLabel: 'VGA type',
                        displayField: 'text',
                        valueField: 'value',
                        store: {
                            fields: ['text', 'value'],
                            data: [
                                { text: 'Cirrus Logic GD5446', value: 'cirrus' },
                                { text: 'Standard VGA', value: 'std' },
                                { text: 'VMWare SVGA-II', value: 'vmware' },
                                { text: 'QXL paravirtual graphic card', value: 'qxl' },
                                { text: 'Sun TCX (sun4m only)', value: 'tcx' },
                                { text: 'Sun cgthree (sun4m only)', value: 'cg3' },
                                { text: 'Virtio VGA', value: 'virtio' },
                                { text: 'Disable VGA', value: 'none' }
                            ]
                        }
                    },
                    {
                        xtype: 'checkboxfield',
                        name: 'bootMenuOn',
                        fieldLabel: 'Show Boot Menu',
                    },
                    {
                        xtype: 'textfield',
                        name: 'smp',
                        fieldLabel: 'CPU count',
                    },
                ]
            },
            {
                xtype: 'panel',
                collapsible: true,
                title: 'Network 1',
                defaults: {
                    listeners: {
                        change: function (field, newVal, oldVal) {
                            var tabPanel = Ext.getCmp('tabPanel');
                            var panel = tabPanel.queryById('vm' + eOpts.data.id);
                            if (panel != null) {
                                var bt = panel.queryById('bt_save');
                                if (bt != null) {
                                    bt.setDisabled(false);
                                }
                            }
                        }
                    },
                },
                items: [
                    {
                        xtype: 'combobox',
                        name: 'net1type',
                        fieldLabel: 'Network Type',
                        displayField: 'text',
                        valueField: 'value',
                        store: {
                            fields: ['text', 'value'],
                            data: [
                                { text: 'Bridge', value: 'bridge' },
                                { text: 'NAT', value: 'nat' },
                                { text: 'None', value: 'none' },
                            ]
                        }
                    },
                    {
                        xtype: 'combobox',
                        name: 'net1model',
                        fieldLabel: 'Adapter Model',
                        displayField: 'text',
                        valueField: 'value',
                        store: {
                            fields: ['text', 'value'],
                            data: [
                                { text: 'virtio', value: 'virtio' },
                                { text: 'i82551', value: 'i82551' },
                                { text: 'i82557b', value: 'i82557b' },
                                { text: 'i82559er', value: 'i82559er' },
                                { text: 'ne2k_pci', value: 'ne2k_pci' },
                                { text: 'ne2k_isa', value: 'ne2k_isa' },
                                { text: 'pcnet', value: 'pcnet' },
                                { text: 'rtl8139', value: 'rtl8139' },
                                { text: 'e1000', value: 'e1000' },
                                { text: 'smc91c111', value: 'smc91c111' },
                                { text: 'lance', value: 'lance' },
                                { text: 'mcf_fec', value: 'mcf_fec' },
                            ]
                        }
                    },
                    {
                        xtype: 'textfield',
                        name: 'net1mac',
                        fieldLabel: 'MAC'
                    },
                    {
                        xtype: 'textfield',
                        name: 'net1bridge',
                        fieldLabel: 'Bridge Interface'
                    },
                    {
                        xtype: 'textfield',
                        name: 'net1dhcp',
                        fieldLabel: 'NAT Network'
                    },
                    {
                        xtype: 'textfield',
                        name: 'net1dhcpstart',
                        fieldLabel: 'DHCP from'
                    },
                ]
            },
            {
                xtype: 'panel',
                collapsible: true,
                title: 'Network 2',
                defaults: {
                    listeners: {
                        change: function (field, newVal, oldVal) {
                            var tabPanel = Ext.getCmp('tabPanel');
                            var panel = tabPanel.queryById('vm' + eOpts.data.id);
                            if (panel != null) {
                                var bt = panel.queryById('bt_save');
                                if (bt != null) {
                                    bt.setDisabled(false);
                                }
                            }
                        }
                    },
                },
                items: [
                    {
                        xtype: 'combobox',
                        name: 'net2type',
                        fieldLabel: 'Network Type',
                        displayField: 'text',
                        valueField: 'value',
                        store: {
                            fields: ['text', 'value'],
                            data: [
                                { text: 'Bridge', value: 'bridge' },
                                { text: 'NAT', value: 'nat' },
                                { text: 'None', value: 'none' },
                            ]
                        }
                    },
                    {
                        xtype: 'combobox',
                        name: 'net2model',
                        fieldLabel: 'Adapter Model',
                        displayField: 'text',
                        valueField: 'value',
                        store: {
                            fields: ['text', 'value'],
                            data: [
                                { text: 'virtio', value: 'virtio' },
                                { text: 'i82551', value: 'i82551' },
                                { text: 'i82557b', value: 'i82557b' },
                                { text: 'i82559er', value: 'i82559er' },
                                { text: 'ne2k_pci', value: 'ne2k_pci' },
                                { text: 'ne2k_isa', value: 'ne2k_isa' },
                                { text: 'pcnet', value: 'pcnet' },
                                { text: 'rtl8139', value: 'rtl8139' },
                                { text: 'e1000', value: 'e1000' },
                                { text: 'smc91c111', value: 'smc91c111' },
                                { text: 'lance', value: 'lance' },
                                { text: 'mcf_fec', value: 'mcf_fec' },
                            ]
                        }
                    },
                    {
                        xtype: 'textfield',
                        name: 'net2mac',
                        fieldLabel: 'MAC'
                    },
                    {
                        xtype: 'textfield',
                        name: 'net2bridge',
                        fieldLabel: 'Bridge Interface'
                    },
                    {
                        xtype: 'textfield',
                        name: 'net2dhcp',
                        fieldLabel: 'NAT Network'
                    },
                    {
                        xtype: 'textfield',
                        name: 'net2dhcpstart',
                        fieldLabel: 'DHCP from'
                    },
                ]
            },
            {
                xtype: 'panel',
                collapsible: true,
                title: 'Storage',
                defaults: {
                    listeners: {
                        change: function (field, newVal, oldVal) {
                            var tabPanel = Ext.getCmp('tabPanel');
                            var panel = tabPanel.queryById('vm' + eOpts.data.id);
                            if (panel != null) {
                                var bt = panel.queryById('bt_save');
                                if (bt != null) {
                                    bt.setDisabled(false);
                                }
                            }
                        }
                    },
                },
                items: [
                    {
                        xtype: 'textfield',
                        name: 'hda',
                        fieldLabel: 'hda'
                    },
                    {
                        xtype: 'textfield',
                        name: 'hdb',
                        fieldLabel: 'hdb',
                    },
                    {
                        xtype: 'textfield',
                        name: 'hdc',
                        fieldLabel: 'hdc',
                    },
                    {
                        xtype: 'textfield',
                        name: 'hdd',
                        fieldLabel: 'hdd',
                    },
                ]
            },
            {
                xtype: 'panel',
                collapsible: true,
                title: 'Extra',
                defaults: {
                    listeners: {
                        change: function (field, newVal, oldVal) {
                            var tabPanel = Ext.getCmp('tabPanel');
                            var panel = tabPanel.queryById('vm' + eOpts.data.id);
                            if (panel != null) {
                                var bt = panel.queryById('bt_save');
                                if (bt != null) {
                                    bt.setDisabled(false);
                                }
                            }
                        }
                    },
                },
                items: [
                    {
                        xtype: 'textfield',
                        name: 'extra',
                        fieldLabel: 'extra'
                    },
                ]
            },
            {
                xtype: 'panel',
                itemId: 'screenshot',
                collapsible: true,
                title: 'Screenshot',
                items: [
                    {
                        xtype: 'image',
                        itemId: 'scrImg',
                        imageSrc: URL_BASE + '/VmImage/' + eOpts.data.id,
                        refreshMe: function () {
                            var tabPanel = Ext.getCmp('tabPanel');
                            var panel = tabPanel.queryById('vm' + eOpts.data.id);
                            if (panel != null) {
                                var img = panel.queryById('scrImg');
                                var el = img.getEl();
                                if (el != null) {
                                    el.dom.src = img.imageSrc + '?SynoToken=' + SynoToken + '&dc=' + new Date().getTime();
                                }
                            }
                        },
                        listeners: {
                            render: function () {
                                //this.refreshMe();
                                Ext.TaskManager.start({
                                    run: this.refreshMe,
                                    interval: 15000
                                });
                            }
                        }
                    }
                ]
            }
        ]
    });

    form.loadRecord(eOpts);
    ElementDisable(form, eOpts.data.running);
    if (eOpts.data.running) {
        ButtonsDisable(form, true, false, false, false);
    }
    else {
        ButtonsDisable(form, false, true, true, true);
    }

    return form;
}

var listOfMachines = Ext.create('Ext.grid.Panel', {
    id: 'vmList',
    title: 'Virtual machines',
    store: vmStore,
    stripeRows: true,
    hideHeaders: true,
    columns: [{
        id: 'name',
        dataIndex: 'name',
        store: vmStore,
        flex: 1,
    }],
    listeners: {
        select: function (records, eOpts) {
            var tabPanel = Ext.getCmp('tabPanel');
            var t = tabPanel.queryById('vm' + eOpts.data.id);
            if (t == null) {
                var newVm = create_vm_form(eOpts);
                tabPanel.add(newVm);
                newVm.show();
            }
            else {
                t.show();
            }
        }
    },
    height: 670,
    columnWidth: 0.2
});

var welcome = Ext.create('Ext.Panel', {
    title: 'Wellcome',
    //html: '<h1>Welcome to QEMU for Synology DSM 6.0!</h1>',
	id: 'my-log',
	listeners: {
        'render': function()
            {
                Ext.Ajax.request({
                    url: 'welcome.html',
                    success: function(response){
                        Ext.getCmp('my-log').update( response.responseText );
                    }
                });                
            }
    }
});

var machineDetails = Ext.create('Ext.tab.Panel', {
    id: 'tabPanel',
    columnWidth: 0.8,
    height: 670,
    items: [welcome] 
});

function CreateDiskWindow() {
    var window = Ext.create('Ext.window.Window', {
        title: 'Disk Image Create',
        height: 200,
        width: 400,
        layout: 'fit',
        defaults: {
            flex: 1
        },
        modal: true,
        items: {
            xtype: 'form',
            itemId: 'diskForm',
            layout: {
                type: 'form',
                align: 'stretch'
            },
            items: [
                {
                    xtype: 'textfield',
                    name: 'filename',
                    fieldLabel: 'Filename',
                },
                {
                    xtype: 'combobox',
                    name: 'fmt',
                    fieldLabel: 'Image format',
                    displayField: 'text',
                    valueField: 'value',
                    store: {
                        fields: ['text', 'value'],
                        data: [
                            { text: 'QEMU copy-on-write image [qcow2]', value: 'qcow2' },
                            { text: 'Plain binary image [raw]', value: 'raw' },
                            { text: 'Compressed Loop image [cloop]', value: 'cloop' },
                            { text: 'Copy-on-write image [cow]', value: 'cow' },
                            { text: 'QEMU old cow image [qcow]', value: 'qcow' },
                            { text: 'VMware 3 & 4, or 6 image [vmdk]', value: 'vmdk' },
                            { text: 'VirtualBox 1.1 compatible image [vdi]', value: 'vdi' },
                            { text: 'Hyper-V compatible image [vhdx]', value: 'vhdx' },
                            { text: 'Hyper-V legacy image [vpc]', value: 'vpc' },
                            { text: 'Bochs images of growing type [bochs]', value: 'bochs' },
                            { text: 'Apple disk image [dmg]', value: 'dmg' },
                            { text: 'Parallels disk image [parallels]', value: 'parallels' },
                        ]
                    }
                },
                {
                    xtype: 'textfield',
                    name: 'size',
                    fieldLabel: 'Size (suffixes: K, M, G etc.)',
                },
                {
                    xtype: 'textfield',
                    name: 'options',
                    fieldLabel: 'Image format options',
                },
                {
                    xtype: 'panel',
                    layout: 'hbox',
                    align: 'center',
                    flex: 1,
                    items: [
                        {
                            xtype: 'button',
                            text: 'Create',
                            flex: 1,
                            handler: function () {
                                var form = this.up('form');
                                var record = form.getRecord();
                                var bt = this;
                                if (form.isValid()) { 
                                    form.updateRecord(record);
                                    record.save({
                                        success: function (rec) {
                                            Ext.Msg.alert('Success', 'Disk created successfully.')
                                            form.up('window').close();
                                        },
                                        failure: function (rec) {
                                            Ext.Msg.alert('Failure', 'Failed to create disk!')
                                        }
                                    });
                                } else { 
                                    Ext.Msg.alert('Invalid Data', 'Please correct errors.')
                                }
                            }
                        }
                    ]
                }
            ]
        }
    });

    return window;
}

function start() {
    vmStore.load();

    Ext.application({
        name: 'QemuUI',
        launch: function () {
            Ext.create('Ext.container.Viewport', {
                items: [{
                    xtype: 'panel',
                    layout: 'fit',
                    items: [
						{
						    xtype: 'toolbar',
						    docked: 'top',
						    height: 30,
						    title: 'VM Toolbar',
						    items: [
								{
								    xtype: 'button',
								    iconCls: 'x-fa fa-plus',
								    text: 'New',
								    handler: function () {
								        var vm = Ext.create('qemuApp.model.VirtualMachine');
								        vm.set('name', 'New VM');
								        vmStore.add(vm);
								        var eOpts = vmStore.last();
								        var newVm = create_vm_form(eOpts);
								        var tabPanel = Ext.getCmp('tabPanel');
								        tabPanel.add(newVm);
								        newVm.show();
								    }
								},
								{
								    xtype: 'button',
								    iconCls: 'x-fa fa-remove',
								    text: 'Delete',
								    handler: function () {
								        var sel = listOfMachines.getSelection();
								        if (sel != null && sel.length > 0) {
								            Ext.Msg.confirm("Confirmation", "Are you sure you want to DELETE '" + sel[0].data.name + "' VM?", function (btnText) {
								                if (btnText === "yes") {
								                    vmStore.remove(sel[0]);
								                    vmStore.save();
													var tabPanel = Ext.getCmp('tabPanel');
													var panel = tabPanel.queryById('vm' + sel[0].data.id);
													if (panel != null) {
														panel.close();
													}
								                }
								            }, this);
								        }
								    }
								},
							    {
							        xtype: 'button'
							    },
						        {
						            xtype: 'button',
						            iconCls: 'x-fa fa-hdd-o',
						            text: 'Create Disk',
						            handler: function () {
						                var disk = Ext.create('qemuApp.model.CreateDisk');
						                var window = CreateDiskWindow();
						                var form = window.queryById('diskForm');
						                form.loadRecord(disk);
						                window.show();
						            }
						        },
/*								{
								    xtype: 'button',
								    iconCls: 'x-fa fa-arrows-h',
								    text: 'Resize Disk',
								    handler: function () {
								        Ext.Msg.confirm("Info", "Function not implemented!", function (btnText) { }, this);
								        //var sel = listOfMachines.getSelections();
								        //if (sel != null && sel.length > 0) {
								        //    Ext.Msg.confirm("Confirmation", "Are you sure you want to DELETE '" + sel[0]['name'] + "' VM?", function (btnText) {
								        //        if (btnText === "yes") {
								        //            vmStore.remove(sel[0]);
								        //            vmStore.save();
								        //        }
								        //    }, this);
								        //}
								    }
								}
*/						    ]
						},
						{
						    xtype: 'panel',
						    layout: 'column',
						    items: [
								listOfMachines,
								machineDetails
						    ]
						}]
                }]
            });
        }
    });
}

function error(msgHtml) {
    Ext.application({
        name: 'QemuUI',
        launch: function () {
            Ext.create('Ext.container.Viewport', {
                layout: 'fit',
                html: msgHtml
            });
        }
    });
}
