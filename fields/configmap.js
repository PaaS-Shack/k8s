

module.exports = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        data: {
            type: 'object',
            properties: {
                username: { type: 'string', empty: false, required: true },
                password: { type: 'string', empty: false, required: true },
                email: { type: 'string', empty: false, required: true },
                server: { type: 'string', empty: false, required: true },
            }
        }
    }
};