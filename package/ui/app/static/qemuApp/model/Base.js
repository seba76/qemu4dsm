Ext.define('qemuApp.model.Base', {
    extend: 'Ext.data.Model',
    fields: [{ name: 'id' }],

    schema: {
        namespace: 'qemuApp.model',

        proxy: { 
            type: 'ajax',
            url: URL_BASE + '/{entityName}',
            batchActions: false,
            enablePagingParams: false,
            disableCaching: true,
            limitParam: false,
            startParam: false,
            pageParam: false,
            useDefaultXhrHeader: true,
            actionMethods: {
                create: 'PUT',
                read: 'GET',
                update: 'POST',
                destroy: 'DELETE'
            },
            reader: {
                type: 'json',
                rootProperty: '{entityName:lowercase}'
            },
            writer: {
                type: 'json',
                writeAllFields: true,
                rootProperty: '{entityName:lowercase}'
            }
        }
    }
});