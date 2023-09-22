

module.exports = {
    type: 'object',
    properties: {
        namespace: { type: 'string', empty: false, required: true },
        deployment: { type: 'string', empty: false, required: true },
        key: { type: 'string', empty: false, required: true },
        value: [
            { type: 'string', required: false },
            { type: 'number', required: false },
            { type: 'boolean', required: false },
        ],
        type: {
            type: 'enum',
            values: [
                'secret', 'username', 'namespace',
                'deployment', 'provided', 'provision',
                'as', 'route', 'map'],
            default: 'as',
            required: true
        },
        caller: { type: "string", required: false, },
        index: { type: "number", default: 0, required: false, },
        scope: {
            type: 'enum',
            values: ['RUN_TIME', 'BUILD_TIME', 'RUN_AND_BUILD_TIME'],
            default: 'RUN_TIME', required: false,
        },
    }
}