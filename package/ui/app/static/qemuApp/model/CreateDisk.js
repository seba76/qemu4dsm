Ext.define('qemuApp.model.CreateDisk', {
    extend: 'qemuApp.model.Base',
    fields: [
        { name: 'filename' },
        { name: 'fmt', defaultValue: 'qcow2' },
        { name: 'size', defaultValue: '2G' },
        { name: 'options' },
    ],
});
