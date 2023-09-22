

module.exports = {
    type: 'object',
    properties: {
        fsGroup: { type: 'number', min: 0, required: false },
        runAsGroup: { type: 'number', min: 0, required: false },
        runAsNonRoot: { type: 'boolean', default: false, required: false },
        runAsUser: { type: 'number', min: 0, required: false },
        seLinuxOptions: {
            type: 'object',
            properties: {
                level: { type: 'string', empty: false, required: true },
                role: { type: 'string', empty: false, required: true },
                type: { type: 'string', empty: false, required: true },
                user: { type: 'string', empty: false, required: true },
            }
        },
        supplementalGroups: { type: 'array', items: { type: 'number', min: 0, required: true }, required: false },
        sysctls: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string', empty: false, required: true },
                    value: { type: 'string', empty: false, required: true },
                }
            },
            required: false
        },
        add: {
            type: 'array',
            items: {
                type: 'string',
                empty: false,
                required: true,
                values: ['ALL', 'AUDIT_CONTROL', 'AUDIT_WRITE', 'BLOCK_SUSPEND', 'CHOWN', 'DAC_OVERRIDE', 'DAC_READ_SEARCH', 'FOWNER', 'FSETID', 'IPC_LOCK', 'IPC_OWNER', 'KILL', 'LEASE', 'LINUX_IMMUTABLE', 'MAC_ADMIN', 'MAC_OVERRIDE', 'MKNOD', 'NET_ADMIN', 'NET_BIND_SERVICE', 'NET_BROADCAST', 'NET_RAW', 'SETFCAP', 'SETGID', 'SETPCAP', 'SETUID', 'SYS_ADMIN', 'SYS_BOOT', 'SYS_CHROOT', 'SYS_MODULE', 'SYS_NICE', 'SYS_PACCT', 'SYS_PTRACE', 'SYS_RAWIO', 'SYS_RESOURCE', 'SYS_TIME', 'SYS_TTY_CONFIG', 'SYSLOG', 'WAKE_ALARM']
            },
            default: [],
            required: false
        },
        drop: {
            type: 'array',
            items: {
                type: 'string',
                empty: false,
                required: true,
                values: ['ALL', 'AUDIT_CONTROL', 'AUDIT_WRITE', 'BLOCK_SUSPEND', 'CHOWN', 'DAC_OVERRIDE', 'DAC_READ_SEARCH', 'FOWNER', 'FSETID', 'IPC_LOCK', 'IPC_OWNER', 'KILL', 'LEASE', 'LINUX_IMMUTABLE', 'MAC_ADMIN', 'MAC_OVERRIDE', 'MKNOD', 'NET_ADMIN', 'NET_BIND_SERVICE', 'NET_BROADCAST', 'NET_RAW', 'SETFCAP', 'SETGID', 'SETPCAP', 'SETUID', 'SYS_ADMIN', 'SYS_BOOT', 'SYS_CHROOT', 'SYS_MODULE', 'SYS_NICE', 'SYS_PACCT', 'SYS_PTRACE', 'SYS_RAWIO', 'SYS_RESOURCE', 'SYS_TIME', 'SYS_TTY_CONFIG', 'SYSLOG', 'WAKE_ALARM']
            },
            default: [],
            required: false
        },
    }
};