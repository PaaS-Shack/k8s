
/**
 * This is a definition of the docker pull redis:7.2.1-alpine image.
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "redis",
    namespace:"library",
    tag: "7.2.1-alpine",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "redis:7.2.1-alpine",
    registry: "docker.io",
    repository: "library/redis",
    description: "Redis is an open source (BSD licensed), in-memory data structure store, used as a database, cache, and message broker.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "redis",
            port: 6379,
            protocol: "TCP"
        }
    ],
    env: [
        {
            key: "REDIS_PASSWORD",
            type: "secret"
        },
    ],
    volumes: [
        {
            name: "redis-data",
            type: "persistentVolumeClaim",
            mountPath: "/data"
        }
    ],
    resources: {
        limits: {
            cpu: 500,// 500m
            memory: 500,// 500Mi
        },
        requests: {
            cpu: 100,// 100m
            memory: 20,// 20Mi
        }
    },
    readinessProbe: {
        exec: {
            command: [
                "redis-cli",
                "ping"
            ]
        },
        initialDelaySeconds: 10,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
    },
    livenessProbe: {
        exec: {
            command: [
                "redis-cli",
                "ping"
            ]
        },
        initialDelaySeconds: 10,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
    },
    securityContext: {
        runAsUser: 1000,
        runAsGroup: 1000,
        fsGroup: 1000
    },
    labels:[
        {
            "key": "app",
            "value": "redis"
        },
        {
            "key": "tier",
            "value": "backend"
        }    
    ],
    annotations: [
        {
            "key": "description",
            "value": "Redis is an open source (BSD licensed), in-memory data structure store, used as a database, cache, and message broker."
        }
    ],
    affinity: {
        nodeAffinity: {
            requiredDuringSchedulingIgnoredDuringExecution: {
                nodeSelectorTerms: [
                    {
                        matchExpressions: [
                            {
                                key: "k8s.one-host.ca/role-compute",
                                operator: "In",
                                values: [
                                    "true"
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    },
};