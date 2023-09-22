

module.exports = {
    type: 'object',
    properties: {
        nodeAffinity: {
            type: 'object',
            properties: {
                requiredDuringSchedulingIgnoredDuringExecution: {
                    type: 'object',
                    properties: {
                        nodeSelectorTerms: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    matchExpressions: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                key: { type: 'string', empty: false, required: true },
                                                operator: { type: 'enum', values: ['In', 'NotIn', 'Exists', 'DoesNotExist', 'Gt', 'Lt'], default: 'In', required: true },
                                                values: { type: 'array', items: { type: 'string', empty: false, required: true } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}