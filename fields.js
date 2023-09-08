


// This function creates a new volume object for the given name, type, mountPath, and optionally subPath and readOnly properties
// It returns the new volume object

const VOLUMESECRET_FIELDS = {
    type: 'object',
    props: {
        name: { type: 'string', empty: false, required: true },
        secretName: { type: 'string', empty: false, required: true },
        items: {
            type: 'array',
            items: {
                type: 'object',
                props: {
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
    props: {
        name: { type: 'string', empty: false, required: true },
        configMapName: { type: 'string', empty: false, required: true },
        items: {
            type: 'array',
            items: {
                type: 'object',
                props: {
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
    props: {
        name: { type: 'string', empty: false, required: true },
        type: {
            type: 'enum',
            values: ['emptyDir', 'hostPath', 'secret', 'configMap', 'persistentVolumeClaim'],
            default: 'emptyDir',
            required: true
        },
        mountPath: { type: 'string', empty: false, required: true },
        subPath: { type: 'string', empty: false, default: null, required: false },
        readOnly: { type: 'boolean', default: false, required: false },
        medium: { type: 'enum', values: ['Memory'], default: 'Memory', required: false },
        secret: VOLUMESECRET_FIELDS,
        configMap: VOLUMECONFIGMAP_FIELDS,
        persistentVolumeClaim: {
            type: 'object',
            props: {
                claimName: { type: 'string', empty: false, required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },
        hostPath: {
            type: 'object',
            props: {
                path: { type: 'string', empty: false, required: true },
                type: { type: 'enum', values: ['Directory', 'File', 'Socket', 'CharDevice', 'BlockDevice'], default: 'Directory', required: false },
            }
        },

    }
};

const ENV_FIELDS = {
    type: 'object',
    props: {
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

const PORT_FIELDS = {
    type: 'object',
    props: {
        name: { type: 'string', empty: false, required: true },
        port: { type: 'number', empty: false, required: true },
        targetPort: { type: 'number', empty: false, required: true },
        protocol: { type: 'enum', values: ['TCP', 'UDP', 'HTTP'], default: 'TCP', required: false },
        subdomain: { type: 'string', empty: false, required: false },
        nodePort: { type: 'number', min: 0, max: 65535, required: false },

    }
};

const RESOURCE_FIELDS = {
    type: 'object',
    props: {
        limits: {
            type: 'object',
            props: {
                cpu: { type: 'number', min: 0, required: false },
                memory: { type: 'number', min: 0, required: false },
            }
        },
        requests: {
            type: 'object',
            props: {
                cpu: { type: 'number', min: 0, required: false },
                memory: { type: 'number', min: 0, required: false },
            }
        }
    }
};

const AFFINITY_FIELDS = {
    type: 'object',
    props: {
        nodeAffinity: {
            type: 'object',
            props: {
                requiredDuringSchedulingIgnoredDuringExecution: {
                    type: 'object',
                    props: {
                        nodeSelectorTerms: {
                            type: 'array',
                            items: {
                                type: 'object',
                                props: {
                                    matchExpressions: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            props: {
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

const LABELS_FIELDS = {
    type: 'array',
    items: {
        type: 'object',
        props: {
            key: { type: 'string', empty: false, required: true },
            value: { type: 'string', empty: false, required: true }
        }
    },
    default: [],
    required: false
};

const SECRET_FIELDS = {
    type: 'object',
    props: {
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
            props: {
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
    props: {
        name: { type: 'string', empty: false, required: true },
        data: {
            type: 'object',
            props: {
                username: { type: 'string', empty: false, required: true },
                password: { type: 'string', empty: false, required: true },
                email: { type: 'string', empty: false, required: true },
                server: { type: 'string', empty: false, required: true },
            }
        }
    }
};

const TOLERATIONS_FIELDS = {
    type: 'array',
    items: {
        type: 'object',
        props: {
            key: { type: 'string', empty: false, required: true },
            operator: { type: 'enum', values: ['Equal', 'Exists'], default: 'Equal', required: true },
            value: { type: 'string', empty: false, required: true },
            effect: { type: 'enum', values: ['NoSchedule', 'PreferNoSchedule', 'NoExecute'], default: 'NoSchedule', required: true },
        }
    },
    default: [],
    required: false
};

const PULLSECRETS_FIELDS = {
    type: 'array',
    items: {
        type: 'object',
        props: {
            name: { type: 'string', empty: false, required: true },
        }
    },
    default: [],
    required: false
};

const SECURITYCONTEXT_FIELDS = {
    type: 'object',
    props: {
        fsGroup: { type: 'number', min: 0, required: false },
        runAsGroup: { type: 'number', min: 0, required: false },
        runAsNonRoot: { type: 'boolean', default: false, required: false },
        runAsUser: { type: 'number', min: 0, required: false },
        seLinuxOptions: {
            type: 'object',
            props: {
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
                props: {
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



// Image is a predefined deployments
const IMAGE_FIELDS = {
    type: 'object',
    props: {
        // image name
        name: { type: 'string', empty: false, required: true },
        // image namespace 
        namespace: { type: 'string', empty: false, required: true },
        // image tag (lastest)
        tag: { type: 'string', empty: false, required: true },
        // image registry (docker.io)
        registry: { type: 'string', empty: false, required: true },
        // image description
        description: { type: 'string', empty: false, required: false },
        // image pull policy (Always)
        imagePullPolicy: { type: 'enum', values: ['Always', 'Never', 'IfNotPresent'], default: 'Always', required: false },
        // ports
        ports: { type: 'array', items: PORT_FIELDS, required: false },
        // env
        env: { type: 'array', items: ENV_FIELDS, required: false },
        // volumes
        volumes: { type: 'array', items: VOLUME_FIELDS, required: false },
        // resources
        resources: { type: 'object', props: RESOURCE_FIELDS, required: false },

        args: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },

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
                props: {
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
                action: 'k8s.builds.resolve',
            }
        },
    }
};


const exampleDeployment = {
    name: 'my-deployment',
    namespace: 'my-namespace',
    image: 'my-image',
    replicas: 1,
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
        }
    ],
    volumes: [
        {
            name: 'my-volume',
            type: 'emptyDir',
            mountPath: '/my-volume',
            subPath: '',
            readOnly: false
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
            ip: '10.0.0.1',
            hostnames: [
                'my-hostname'
            ]
        }
    ],
    hostNetwork: false,
    hostPID: false,
    hostIPC: false,
    shareProcessNamespace: false,
    serviceAccountName: 'my-service-account',
    schedulerName: 'my-scheduler',
    priorityClassName: 'my-priority-class',
};

const DEPLOYMENT_FIELDS = {
    type: 'object',
    props: {
        // deployment name
        name: { type: 'string', empty: false, required: true },
        // deployment namespace id
        namespace: {
            type: 'string', empty: false, required: true,
            populate: {
                action: 'k8s.namespaces.resolve',
            },
        },
        // deployment image id
        image: {
            type: 'string', empty: false, required: true,
            populate: {
                action: 'k8s.images.resolve',
            }
        },
        // deployment replicas (1)
        replicas: { type: 'number', default: 1, min: 0, max: 10, required: false },
        // deployment ports. can be used to open abatrairy ports outside of image ports
        ports: { type: 'array', items: PORT_FIELDS, default: [], required: false },
        // deployment env. can be used to set env variables
        env: { type: 'array', items: ENV_FIELDS, default: [], required: false },
        // deployment volumes. can be used to mount volumes that are shared between containers
        volumes: { type: 'array', items: VOLUME_FIELDS, default: [], required: false },
        // deployment resources limits and requests
        resources: { type: 'object', props: RESOURCE_FIELDS, required: false },
        // deployment args (command line arguments)
        args: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },

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
                props: {
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

const exampleService = {
    name: 'my-service',
    type: 'ClusterIP',
    ports: [
        {
            name: 'http',
            port: 80,
            targetPort: 8080,
            protocol: 'TCP'
        }
    ],
    selector: [
        {
            key: 'app',
            value: 'my-app'
        }
    ],
    externalIPs: [
        '1.1.1.1',
        '1.1.1.2'
    ],
    loadBalancerIP: '',
    loadBalancerSourceRanges: [

    ],
    externalName: '',
    sessionAffinity: 'None',
    externalTrafficPolicy: 'Cluster',
    healthCheckNodePort: 0,
    publishNotReadyAddresses: false,
    clusterIP: ''
};

const SERVICE_FIELDS = {
    type: 'object',
    props: {
        name: { type: 'string', empty: false, required: true },
        type: { type: 'enum', values: ['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'], default: 'ClusterIP', required: false },
        ports: { type: 'array', items: PORT_FIELDS, required: false },
        selector: LABELS_FIELDS,
        externalIPs: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
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
    props: {
        name: { type: 'string', empty: false, required: true },
        host: { type: 'string', empty: false, required: true },
        path: { type: 'string', empty: false, required: true },
        serviceName: { type: 'string', empty: false, required: true },
        servicePort: { type: 'number', min: 0, max: 65535, required: true },
        tls: {
            type: 'object',
            props: {
                secretName: { type: 'string', empty: false, required: true },
                hosts: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
            }
        }
    }
};

const PERSISTENTVOLUME_FIELDS = {
    type: 'object',
    props: {
        name: { type: 'string', empty: false, required: true },
        type: { type: 'enum', values: ['hostPath', 'nfs', 'iscsi', 'glusterfs', 'rbd', 'cephfs', 'cinder', 'fc', 'flocker', 'flexVolume', 'azureFile', 'vsphereVolume', 'quobyte', 'azureDisk', 'portworxVolume', 'scaleIO', 'local', 'storageos', 'csi'], default: 'hostPath', required: true },
        hostPath: {
            type: 'object',
            props: {
                path: { type: 'string', empty: false, required: true },
                type: { type: 'enum', values: ['Directory', 'File', 'Socket', 'CharDevice', 'BlockDevice'], default: 'Directory', required: false },
            }
        },
        nfs: {
            type: 'object',
            props: {
                server: { type: 'string', empty: false, required: true },
                path: { type: 'string', empty: false, required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },
    }
};

const PERSISTENTVOLUMECLAIM_FIELDS = {
    type: 'object',
    props: {
        name: { type: 'string', empty: false, required: true },
        storageClassName: { type: 'string', empty: false, required: true },
        accessModes: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
        resources: {
            type: 'object',
            props: {
                requests: {
                    type: 'object',
                    props: {
                        storage: { type: 'string', empty: false, required: true },
                    }
                }
            }
        }
    }
};

const STORAGECLASS_FIELDS = {
    type: 'object',
    props: {
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
    props: {
        name: { type: 'string', empty: false, required: true },
        labels: LABELS_FIELDS,
        annotations: LABELS_FIELDS,
    }
};

const ROLE_FIELDS = {
    type: 'object',
    props: {
        name: { type: 'string', empty: false, required: true },
        rules: {
            type: 'array',
            items: {
                type: 'object',
                props: {
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
    props: {
        name: { type: 'string', empty: false, required: true },
        roleRef: {
            type: 'object',
            props: {
                apiGroup: { type: 'string', empty: false, required: true },
                kind: { type: 'string', empty: false, required: true },
                name: { type: 'string', empty: false, required: true },
            }
        },
        subjects: {
            type: 'array',
            items: {
                type: 'object',
                props: {
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
    props: {
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
};
