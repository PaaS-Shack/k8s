


// This function creates a new volume object for the given name, type, mountPath, 
// and optionally subPath and readOnly properties
// It returns the new volume object

const VOLUMESECRET_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        secretName: { type: 'string', empty: false, required: true },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    key: { type: 'string', empty: false, required: true },
                    path: { type: 'string', empty: false, required: true },
                    mode: { type: 'number', min: 0, required: false },
                }
            },
            required: false
        },
        defaultMode: { type: 'number', min: 0, required: false },
        optional: { type: 'boolean', default: false, required: false },
    }
};

const VOLUMECONFIGMAP_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        configMapName: { type: 'string', empty: false, required: false },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    key: { type: 'string', empty: false, required: true },
                    path: { type: 'string', empty: false, required: true },
                    mode: { type: 'number', min: 0, required: false },
                }
            },
            required: false
        },
        defaultMode: { type: 'number', min: 0, required: false },
        optional: { type: 'boolean', default: false, required: false },
    }
};


const VOLUME_FIELDS = {
    type: 'object',
    properties: {
        // Name of the volume
        name: { type: 'string', empty: false, required: true },

        // Namespace ID of the volume
        namespace: {
            type: 'string',
            empty: false,
            required: true,
            populate: {
                action: 'v1.k8s.namespaces.resolve'
            }
        },

        // Deployment ID of the volume
        deployment: {
            type: 'string',
            empty: false,
            required: false,
            populate: {
                action: 'v1.k8s.deployments.resolve'
            }
        },

        // Name of the underlying volume name
        volumeName: { type: 'string', empty: false, required: false },

        // Type of the volume
        type: {
            type: 'enum',
            values: [
                'emptyDir',
                'hostPath',
                'secret',
                'configMap',
                'persistentVolumeClaim',
                'persistentVolume'
            ],
            default: 'emptyDir',
            required: true
        },

        // Mount path of the volume
        mountPath: {
            type: 'string',
            empty: false,
            required: false,// a persistentVolume might not have a mount point.
            pattern: '^(/[^/]+)+$', // starts with / and has at least one / in it
        },

        // Sub path of the volume
        subPath: { type: 'string', empty: false, default: null, required: false },

        // Read only flag of the volume
        readOnly: { type: 'boolean', default: false, required: false },

        size: { type: 'number', min: 0, default: 1024, required: false },
        accessModes: {
            type: 'array',
            items: {
                type: 'enum',
                values: ['ReadWriteOnce', 'ReadOnlyMany', 'ReadWriteMany'],
                default: 'ReadWriteOnce',
                required: false
            },
            default: ['ReadWriteOnce'],
            required: false
        },

        secret: VOLUMESECRET_FIELDS,
        configMap: VOLUMECONFIGMAP_FIELDS,

        // persistent volume config
        persistentVolume: {
            type: 'object',
            properties: {
                name: { type: 'string', empty: false, required: true },
                type: {
                    type: 'enum',
                    values: [
                        'hostPath', 'nfs', 'iscsi', 'glusterfs',
                        'rbd', 'cephfs', 'cinder', 'fc', 'flocker',
                        'flexVolume', 'azureFile', 'vsphereVolume',
                        'quobyte', 'azureDisk', 'portworxVolume',
                        'scaleIO', 'local', 'storageos', 'csi'
                    ], default: 'hostPath', required: true
                },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },

        // persistent volume claim config
        persistentVolumeClaim: {
            type: 'object',
            properties: {
                claimName: { type: 'string', empty: false, required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },

        // host path volume config
        hostPath: {
            type: 'object',
            properties: {
                path: { type: 'string', empty: false, required: true },
                type: {
                    type: 'enum',
                    values: ['Directory', 'File', 'Socket', 'CharDevice', 'BlockDevice'],
                    default: 'Directory',
                    required: false
                },
            }
        },

        // nfs volume config
        nfs: {
            type: 'object',
            properties: {
                server: { type: 'string', empty: false, required: true },
                path: { type: 'string', empty: false, required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },

        // Empty dir volume
        emptyDir: {
            type: 'object',
            properties: {
                medium: { type: 'enum', values: ['Memory'], default: 'Memory', required: false },
                sizeLimit: { type: 'number', min: 0, required: false },
            }
        },


    }
};

const ENVS_FIELDS = {
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

const ENV_FIELDS = {
    type: 'object',
    properties: {
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

const PROBE_FIELDS = {
    type: 'object',
    properties: {
        httpGet: {
            type: 'object',
            properties: {
                path: { type: 'string', empty: false, required: true },
                port: { type: 'number', min: 0, required: true },
                scheme: { type: 'enum', values: ['HTTP', 'HTTPS'], default: 'HTTP', required: false },
                host: { type: 'string', empty: false, required: false },
            },
            required: false,
        },
        exec: {
            type: 'object',
            properties: {
                command: { type: 'array', items: { type: 'string', empty: false, required: true } }
            },
            required: false,
        },
        tcpSocket: {
            type: 'object',
            properties: {
                port: { type: 'number', min: 0, required: true },
                host: { type: 'string', empty: false, required: false },
            },
            required: false,
        },
        initialDelaySeconds: { type: 'number', min: 0, required: false },
        timeoutSeconds: { type: 'number', min: 0, required: false },
        periodSeconds: { type: 'number', min: 0, required: false },
        successThreshold: { type: 'number', min: 0, required: false },
        failureThreshold: { type: 'number', min: 0, required: false },
    },
    required: false
};

const PORT_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        port: { type: 'number', empty: false, required: true },
        targetPort: { type: 'number', empty: false, required: false },
        protocol: { type: 'enum', values: ['TCP', 'UDP', 'HTTP'], default: 'TCP', required: false },
        subdomain: { type: 'string', empty: false, required: false },
        nodePort: { type: 'number', min: 0, max: 65535, required: false },

    }
};

const RESOURCE_FIELDS = {
    type: 'object',
    properties: {
        type: 'object',
        limits: {
            type: 'object',
            properties: {
                cpu: { type: 'number', min: 0, required: false },
                memory: { type: 'number', min: 0, required: false },
            }
        },
        requests: {
            type: 'object',
            properties: {
                cpu: { type: 'number', min: 0, required: false },
                memory: { type: 'number', min: 0, required: false },
            }
        }
    }
};

const AFFINITY_FIELDS = {
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
                                                operator: {
                                                    type: 'enum',
                                                    values: ['In', 'NotIn', 'Exists', 'DoesNotExist', 'Gt', 'Lt'],
                                                    default: 'In', required: true
                                                },
                                                values: {
                                                    type: 'array',
                                                    items: { type: 'string', empty: false, required: true }
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
}

const LABELS_FIELDS = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            key: { type: 'string', empty: false, required: true },
            value: { type: 'string', empty: false, required: true }
        }
    },
    default: [],
    required: false
};

const SECRET_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        type: {
            type: 'enum',
            values: [
                'Opaque',
                'kubernetes.io/dockerconfigjson',
                'kubernetes.io/tls'
            ],
            default: 'Opaque',
            required: true
        },
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

const CONFIGMAP_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        data: {
            type: 'object',
            required: false,
            default: {},
        }
    }
};

const TOLERATIONS_FIELDS = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            key: { type: 'string', empty: false, required: true },
            operator: { type: 'enum', values: ['Equal', 'Exists'], default: 'Equal', required: true },
            value: { type: 'string', empty: false, required: true },
            effect: {
                type: 'enum',
                values: ['NoSchedule', 'PreferNoSchedule', 'NoExecute'],
                default: 'NoSchedule', 
                required: true
            },
        }
    },
    default: [],
    required: false
};

const PULLSECRETS_FIELDS = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            name: { type: 'string', empty: false, required: true },
        }
    },
    default: [],
    required: false
};

const SECURITYCONTEXT_FIELDS = {
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
                values: [
                    'ALL', 'AUDIT_CONTROL', 'AUDIT_WRITE', 'BLOCK_SUSPEND', 'CHOWN', 'DAC_OVERRIDE',
                    'DAC_READ_SEARCH', 'FOWNER', 'FSETID', 'IPC_LOCK', 'IPC_OWNER', 'KILL', 'LEASE',
                    'LINUX_IMMUTABLE', 'MAC_ADMIN', 'MAC_OVERRIDE', 'MKNOD', 'NET_ADMIN', 'NET_BIND_SERVICE',
                    'NET_BROADCAST', 'NET_RAW', 'SETFCAP', 'SETGID', 'SETPCAP', 'SETUID', 'SYS_ADMIN',
                    'SYS_BOOT', 'SYS_CHROOT', 'SYS_MODULE', 'SYS_NICE', 'SYS_PACCT', 'SYS_PTRACE',
                    'SYS_RAWIO', 'SYS_RESOURCE', 'SYS_TIME', 'SYS_TTY_CONFIG', 'SYSLOG', 'WAKE_ALARM'
                ]
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
                values: [
                    'ALL', 'AUDIT_CONTROL', 'AUDIT_WRITE', 'BLOCK_SUSPEND', 'CHOWN', 'DAC_OVERRIDE',
                    'DAC_READ_SEARCH', 'FOWNER', 'FSETID', 'IPC_LOCK', 'IPC_OWNER', 'KILL', 'LEASE',
                    'LINUX_IMMUTABLE', 'MAC_ADMIN', 'MAC_OVERRIDE', 'MKNOD', 'NET_ADMIN', 'NET_BIND_SERVICE',
                    'NET_BROADCAST', 'NET_RAW', 'SETFCAP', 'SETGID', 'SETPCAP', 'SETUID', 'SYS_ADMIN',
                    'SYS_BOOT', 'SYS_CHROOT', 'SYS_MODULE', 'SYS_NICE', 'SYS_PACCT', 'SYS_PTRACE', 'SYS_RAWIO',
                    'SYS_RESOURCE', 'SYS_TIME', 'SYS_TTY_CONFIG', 'SYSLOG', 'WAKE_ALARM'
                ]
            },
            default: [],
            required: false
        },
    }
}


const exampleImage = {
    name: 'my-image',
    namespace: 'my-namespace',
    tag: 'latest',
    registry: 'docker.io',
    description: 'my image description',
    imagePullPolicy: 'Always',
    ports: [
        {
            name: 'http',
            port: 80,
            targetPort: 8080,
            protocol: 'TCP'
        }
    ],
    env: [
        {
            key: 'MY_ENV',
            value: 'my-value'
        }, {
            key: 'MY_ENV2',
            type: 'secret',
        }, {
            key: 'MY_ENV3',
            type: 'username',
        }, {
            key: 'MY_ENV4',
            type: 'namespace',
        }, {
            key: 'MY_ENV5',
            type: 'deployment',
        }, {
            key: 'MY_ENV6',
            type: 'provided',
            value: 'mysql'
        }
    ],
    volumes: [
        {
            name: 'my-volume',
            type: 'emptyDir',
            mountPath: '/my-volume',
            subPath: null,
            readOnly: false
        }, {
            name: 'my-volume2',
            type: 'hostPath',
            mountPath: '/my-volume2',
            subPath: null,
            readOnly: false,
            hostPath: {
                path: '/tmp',
                type: 'Directory'
            }
        }, {
            name: 'my-volume3',
            type: 'persistentVolumeClaim',
            mountPath: '/my-volume3',
            subPath: null,
            readOnly: false,
            persistentVolumeClaim: {
                claimName: 'my-pvc',
                readOnly: false
            }
        }
    ],
    resources: {
        limits: {
            cpu: 100,//millicores
            memory: 512// mb
        },
        requests: {
            cpu: 100,//millicores
            memory: 512// mb
        }
    },

    args: [
        'arg1',
        'arg2'
    ],

    // lables
    labels: [
        {
            key: 'app',
            value: 'my-app'
        }
    ],
    annotations: [
        {
            key: 'app',
            value: 'my-app'
        }
    ],
    nodeSelector: [
        {
            key: 'app',
            value: 'my-app'
        }
    ],
    affinity: {
        nodeAffinity: {
            requiredDuringSchedulingIgnoredDuringExecution: {
                nodeSelectorTerms: [
                    {
                        matchExpressions: [
                            {
                                key: 'app',
                                operator: 'In',
                                values: [
                                    'my-app'
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    },
    tolerations: [
        {
            key: 'app',
            operator: 'Equal',
            value: 'my-app',
            effect: 'NoSchedule'
        }
    ],
    imagePullSecrets: [
        {
            name: 'my-secret'
        }
    ],
    securityContext: {
        fsGroup: 1000,
        runAsGroup: 1000,
        runAsNonRoot: true,
        runAsUser: 1000,
        seLinuxOptions: {
            level: 's0:c123,c456',
            role: 'Role',
            type: 'Type',
        },
        supplementalGroups: [
            1000,
            2000
        ],
        sysctls: [
            {
                name: 'net.core.somaxconn',
                value: '1024'
            }
        ],
        add: [
            'ALL',
            'AUDIT_CONTROL',
            'AUDIT_WRITE'
        ],
        drop: [
            'ALL',
            'AUDIT_CONTROL',
            'AUDIT_WRITE'
        ]
    },
    terminationGracePeriodSeconds: 30,
    dnsPolicy: 'ClusterFirst',
    restartPolicy: 'Always',
    hostAliases: [
        {
            ip: '1.1.1.1',
            hostnames: [
                'my-hostname'
            ]
        }
    ],
    hostNetwork: false,
    hostPID: false,
    hostIPC: false,
    shareProcessNamespace: false,
    serviceAccountName: null,
    schedulerName: null,
    priorityClassName: null,
}

const SHORTVULUME_FIELDS = {
    type: 'object',
    properties: {
        // Name of the volume
        name: { type: 'string', empty: false, required: true },

        // Type of the volume
        type: {
            type: 'enum',
            values: [
                'emptyDir',
                'hostPath',
                'secret',
                'configMap',
                'persistentVolumeClaim',
                'persistentVolume'
            ],
            default: 'emptyDir',
            required: true
        },

        // Mount path of the volume
        mountPath: {
            type: 'string',
            empty: false,
            required: false,// a persistentVolume might not have a mount point.
            pattern: '^(/[^/]+)+$', // starts with / and has at least one / in it
        },

        // Sub path of the volume
        subPath: { type: 'string', empty: false, default: null, required: false },

        // Read only flag of the volume
        readOnly: { type: 'boolean', default: false, required: false },

        size: { type: 'number', min: 0, default: 1024, required: false },// default 1GB

        //
        secret: VOLUMESECRET_FIELDS,
        configMap: VOLUMECONFIGMAP_FIELDS,

        // persistent volume config
        persistentVolume: {
            type: 'object',
            properties: {
                name: { type: 'string', empty: false, required: true },
                type: { type: 'enum', values: ['hostPath', 'nfs', 'iscsi', 'glusterfs', 'rbd', 'cephfs', 'cinder', 'fc', 'flocker', 'flexVolume', 'azureFile', 'vsphereVolume', 'quobyte', 'azureDisk', 'portworxVolume', 'scaleIO', 'local', 'storageos', 'csi'], default: 'hostPath', required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },

        // persistent volume claim config
        persistentVolumeClaim: {
            type: 'object',
            properties: {
                claimName: { type: 'string', empty: false, required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },

        // host path volume config
        hostPath: {
            type: 'object',
            properties: {
                path: { type: 'string', empty: false, required: true },
                type: { type: 'enum', values: ['DirectoryOrCreate', 'Directory', 'File', 'Socket', 'CharDevice', 'BlockDevice'], default: 'DirectoryOrCreate', required: false },
            }
        },

        // nfs volume config
        nfs: {
            type: 'object',
            properties: {
                server: { type: 'string', empty: false, required: true },
                path: { type: 'string', empty: false, required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },

        // Empty dir volume
        emptyDir: {
            type: 'object',
            properties: {
                medium: { type: 'enum', values: ['Memory'], default: 'Memory', required: false },
                sizeLimit: { type: 'number', min: 0, required: false },
            }
        },
    }
}

const DEPLOYMENTSTRATEGY_FIELDS = {
    type: 'object',
    properties: {
        type: {
            type: 'enum',
            values: ['RollingUpdate', 'Recreate'],
            default: 'RollingUpdate',
            required: true
        },
        rollingUpdate: {
            type: 'object',
            properties: {
                maxSurge: { type: 'number', min: 0, max: 100, default: 25, required: false },//percent
                maxUnavailable: { type: 'number', min: 0, mac: 100, default: 25, required: false },// percent
            }
        }
    },
    default: {
        type: 'RollingUpdate',
        rollingUpdate: {
            maxSurge: 25,
            maxUnavailable: 25
        }
    },
    required: false
};

// Image is a predefined deployments
const IMAGE_FIELDS = {
    type: 'object',
    properties: {
        // image name
        name: { type: 'string', empty: false, required: true },

        // image namespace 
        namespace: { type: 'string', empty: false, required: true },

        // image tag (lastest)
        tag: { type: 'string', empty: false, required: true },

        // image digest
        digest: { type: 'string', empty: false, required: false },
        // image registry (docker.io)
        registry: { type: 'string', empty: false, required: true },
        // image repository
        repository: { type: 'string', empty: false, required: false },
        // image name in string form
        image: { type: 'string', empty: false, required: false },
        // image description
        description: { type: 'string', empty: false, required: false },
        // image pull policy (Always)
        imagePullPolicy: { type: 'enum', values: ['Always', 'Never', 'IfNotPresent'], default: 'Always', required: false },
        // ports
        ports: { type: 'array', items: PORT_FIELDS, default: [], required: false },
        // readiness probe
        readinessProbe: PROBE_FIELDS,
        // liveness probe
        livenessProbe: PROBE_FIELDS,
        // history limit
        revisionHistoryLimit: { type: 'number', min: 0, max: 10, default: 1, required: false },
        // progressDeadlineSeconds
        progressDeadlineSeconds: { type: 'number', min: 0, default: 600, required: false },


        // deployment strategy
        strategy: DEPLOYMENTSTRATEGY_FIELDS,

        // env
        env: { type: 'array', items: ENV_FIELDS, required: false },
        // volumes
        volumes: { type: 'array', items: SHORTVULUME_FIELDS, default: [], required: false },
        // resources
        resources: RESOURCE_FIELDS,

        args: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },

        config: {
            type: 'object',
            required: false,
        },

        configMap: CONFIGMAP_FIELDS,

        // lables
        labels: LABELS_FIELDS,
        annotations: LABELS_FIELDS,
        nodeSelector: LABELS_FIELDS,
        affinity: AFFINITY_FIELDS,
        tolerations: TOLERATIONS_FIELDS,
        securityContext: SECURITYCONTEXT_FIELDS,
        // other
        terminationGracePeriodSeconds: { type: 'number', min: 0, required: false },
        dnsPolicy: { type: 'enum', values: ['ClusterFirst', 'Default', 'ClusterFirstWithHostNet', 'None'], default: 'ClusterFirst', required: false },
        restartPolicy: { type: 'enum', values: ['Always', 'OnFailure', 'Never'], default: 'Always', required: false },
        hostAliases: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    ip: { type: 'string', empty: false, required: true },
                    hostnames: { type: 'array', items: { type: 'string', empty: false, required: true } }
                }
            },
            required: false
        },
        hostNetwork: { type: 'boolean', default: false, required: false },
        hostPID: { type: 'boolean', default: false, required: false },
        hostIPC: { type: 'boolean', default: false, required: false },
        shareProcessNamespace: { type: 'boolean', default: false, required: false },
        serviceAccountName: { type: 'string', empty: false, required: false },
        schedulerName: { type: 'string', empty: false, required: false },
        priorityClassName: { type: 'string', empty: false, required: false },
        // build related
        building: { type: 'boolean', default: false, required: false },
        built: { type: 'boolean', default: false, required: false },
        build: {
            type: 'string',
            required: false,
            populate: {
                action: 'v1.k8s.builds.resolve',
            }
        },
    }
};


const DEPLOYMENT_FIELDS = {
    type: 'object',
    properties: {
        // deployment name
        name: { type: 'string', empty: false, required: true },
        // deployment namespace id
        namespace: {
            type: 'string', empty: false, required: true,
            populate: {
                action: 'v1.k8s.namespaces.resolve',
            },
        },
        // deployment image id
        image: {
            type: 'string', empty: false, required: true,
            populate: {
                action: 'v1.k8s.images.resolve',
            }
        },

        // k8s uid
        uid: { type: 'string', empty: false, required: false },

        // deployment vHosts
        vHosts: {
            type: 'array',
            items: 'string',
            default: [],
            required: false,
        },

        // deployment routes
        routes: {
            type: 'array',
            items: 'string',
            required: false,
            default: [],
            populate: {
                action: 'v1.routes.resolve',
            }
        },

        // deployment replicas (1)
        replicas: { type: 'number', default: 1, min: 0, max: 10, required: false },
        // deployment ports. can be used to open abatrairy ports outside of image ports
        ports: { type: 'array', items: PORT_FIELDS, default: [], required: false },
        // readiness probe
        readinessProbe: PROBE_FIELDS,
        // liveness probe
        livenessProbe: PROBE_FIELDS,

        // history limit
        revisionHistoryLimit: { type: 'number', min: 0, max: 10, default: 1, required: false },
        // progressDeadlineSeconds
        progressDeadlineSeconds: { type: 'number', min: 0, default: 600, required: false },

        // deployment strategy
        strategy: DEPLOYMENTSTRATEGY_FIELDS,

        // env
        env: { type: 'array', items: ENV_FIELDS, default: [], required: false },
        // env 
        enviroment: {
            type: "array",
            virtual: true,
            get: function ({ entity, ctx }) {
                return ctx.call('v1.k8s.envs.find', {
                    query: {
                        deployment: this.encodeID(entity._id),
                        namespace: entity.namespace
                    }
                });
            }
        },
        // volumes
        volumes: { type: 'array', items: SHORTVULUME_FIELDS, default: [], required: false },
        // vols
        vols: {
            type: "array",
            virtual: true,
            get: function ({ entity, ctx }) {
                return ctx.call('v1.k8s.volumes.find', {
                    query: {
                        deployment: this.encodeID(entity._id),
                        namespace: entity.namespace
                    }
                });
            }
        },
        // resources
        resources: RESOURCE_FIELDS,

        configMap: CONFIGMAP_FIELDS,

        //lables
        labels: LABELS_FIELDS,
        annotations: LABELS_FIELDS,
        nodeSelector: LABELS_FIELDS,
        affinity: AFFINITY_FIELDS,
        tolerations: TOLERATIONS_FIELDS,
        imagePullSecrets: PULLSECRETS_FIELDS,
        securityContext: SECURITYCONTEXT_FIELDS,

        // other
        terminationGracePeriodSeconds: { type: 'number', min: 0, required: false },
        dnsPolicy: { type: 'enum', values: ['ClusterFirst', 'Default', 'ClusterFirstWithHostNet', 'None'], default: 'ClusterFirst', required: false },
        restartPolicy: { type: 'enum', values: ['Always', 'OnFailure', 'Never'], default: 'Always', required: false },
        hostAliases: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    ip: { type: 'string', empty: false, required: true },
                    hostnames: { type: 'array', items: { type: 'string', empty: false, required: true } }
                }
            },
            required: false
        },
        hostNetwork: { type: 'boolean', default: false, required: false },
        hostPID: { type: 'boolean', default: false, required: false },
        hostIPC: { type: 'boolean', default: false, required: false },
        shareProcessNamespace: { type: 'boolean', default: false, required: false },
        serviceAccountName: { type: 'string', empty: false, default: null, required: false },
        schedulerName: { type: 'string', empty: false, default: null, required: false },
        priorityClassName: { type: 'string', empty: false, default: null, required: false },
    }
};


const SERVICE_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        uid: { type: 'string', empty: false, required: false },
        namespace: {
            type: 'string', empty: false, required: true,
            populate: {
                action: 'v1.k8s.namespaces.resolve',
            },
        },
        deployment: {
            type: 'string', empty: false, required: true,
            populate: {
                action: 'v1.k8s.deployments.resolve',
            }
        },
        type: { type: 'enum', values: ['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'], default: 'ClusterIP', required: false },
        ports: { type: 'array', items: PORT_FIELDS, required: false },
        selector: LABELS_FIELDS,
        externalIPs: { type: 'array', items: { type: 'string', empty: false, required: true }, default: [], required: false },
        loadBalancerIP: { type: 'string', empty: false, required: false },
        loadBalancerSourceRanges: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
        externalName: { type: 'string', empty: false, required: false },
        sessionAffinity: { type: 'enum', values: ['None', 'ClientIP'], default: 'None', required: false },
        externalTrafficPolicy: { type: 'enum', values: ['Cluster', 'Local'], default: 'Cluster', required: false },
        healthCheckNodePort: { type: 'number', min: 0, max: 65535, required: false },
        publishNotReadyAddresses: { type: 'boolean', default: false, required: false },
        clusterIP: { type: 'string', empty: false, required: false },
    }
};

const INGRESS_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        host: { type: 'string', empty: false, required: true },
        path: { type: 'string', empty: false, required: true },
        serviceName: { type: 'string', empty: false, required: true },
        servicePort: { type: 'number', min: 0, max: 65535, required: true },
        tls: {
            type: 'object',
            properties: {
                secretName: { type: 'string', empty: false, required: true },
                hosts: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
            }
        }
    }
};

const PERSISTENTVOLUME_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        type: { type: 'enum', values: ['hostPath', 'nfs', 'iscsi', 'glusterfs', 'rbd', 'cephfs', 'cinder', 'fc', 'flocker', 'flexVolume', 'azureFile', 'vsphereVolume', 'quobyte', 'azureDisk', 'portworxVolume', 'scaleIO', 'local', 'storageos', 'csi'], default: 'hostPath', required: true },
        hostPath: {
            type: 'object',
            properties: {
                path: { type: 'string', empty: false, required: true },
                type: { type: 'enum', values: ['Directory', 'File', 'Socket', 'CharDevice', 'BlockDevice'], default: 'Directory', required: false },
            }
        },
        nfs: {
            type: 'object',
            properties: {
                server: { type: 'string', empty: false, required: true },
                path: { type: 'string', empty: false, required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },
    }
};

const PERSISTENTVOLUMECLAIM_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        storageClassName: { type: 'string', empty: false, required: true },
        accessModes: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
        resources: {
            type: 'object',
            properties: {
                requests: {
                    type: 'object',
                    properties: {
                        storage: { type: 'string', empty: false, required: true },
                    }
                }
            }
        }
    }
};

const STORAGECLASS_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        provisioner: { type: 'string', empty: false, required: true },
        parameters: { type: 'object', required: false },
        reclaimPolicy: { type: 'enum', values: ['Retain', 'Delete', 'Recycle'], default: 'Retain', required: false },
        mountOptions: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
        allowVolumeExpansion: { type: 'boolean', default: false, required: false },
        volumeBindingMode: { type: 'enum', values: ['Immediate', 'WaitForFirstConsumer'], default: 'Immediate', required: false },
    }
};

const NAMESPACE_FIELDS = {
    type: 'object',
    properties: {
        name: {
            ftype: 'string',
            empty: false,
            required: true,
            pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$', // DNS-1123 label
            immutable: true,
        },

        cluster: {
            type: 'string',
            required: false,
            immutable: true,
            default: 'default',
        },

        labels: LABELS_FIELDS,
        annotations: LABELS_FIELDS,

        resourceQuota: {
            type: 'string',
            required: true,
            populate: {
                action: 'v1.k8s.resourcequotas.resolve',
            }
        },
        domain: {
            type: 'string',
            required: true,
            immutable: true,
            populate: {
                action: 'v1.domains.resolve',
            }
        }
    }
};

const ROLE_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        rules: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    apiGroups: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
                    resources: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
                    verbs: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
                    resourceNames: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
                }
            },
            required: false
        },
    }
};

const ROLEBINDING_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        roleRef: {
            type: 'object',
            properties: {
                apiGroup: { type: 'string', empty: false, required: true },
                kind: { type: 'string', empty: false, required: true },
                name: { type: 'string', empty: false, required: true },
            }
        },
        subjects: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    kind: { type: 'string', empty: false, required: true },
                    name: { type: 'string', empty: false, required: true },
                    namespace: { type: 'string', empty: false, required: true },
                }
            },
            required: false
        },
    }
};

const BASE_ENTITY_FIELDS = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        labels: LABELS_FIELDS,
        annotations: LABELS_FIELDS,
    }
};



module.exports = {
    IMAGE_FIELDS,
    DEPLOYMENT_FIELDS,
    SERVICE_FIELDS,
    INGRESS_FIELDS,
    PERSISTENTVOLUME_FIELDS,
    PERSISTENTVOLUMECLAIM_FIELDS,
    STORAGECLASS_FIELDS,
    NAMESPACE_FIELDS,
    ROLE_FIELDS,
    ROLEBINDING_FIELDS,
    SECRET_FIELDS,
    CONFIGMAP_FIELDS,
    VOLUME_FIELDS,
    ENV_FIELDS,
    PORT_FIELDS,
    RESOURCE_FIELDS,
    AFFINITY_FIELDS,
    LABELS_FIELDS,
    TOLERATIONS_FIELDS,
    PULLSECRETS_FIELDS,
    SECURITYCONTEXT_FIELDS,
    BASE_ENTITY_FIELDS,
    SHORTVULUME_FIELDS,
    PROBE_FIELDS,
    ENVS_FIELDS,

};
