
/**
 * This is a definition of the docker pull docker.io/libaray/memcached:1.6.21-alpine image.
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "memcached-1-6-21-alpine",
    namespace: "library",
    tag: "1.6.21-alpine",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "memcached:1.6.21-alpine",
    registry: "docker.io",
    repository: "library/memcached",
    description: "Memcached is an in-memory key-value store for small chunks of arbitrary data (strings, objects) from results of database calls, API calls, or page rendering.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "memcached",
            port: 11211,
            protocol: "TCP"
        }
    ],
    env: [

    ],
    volumes: [

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
                "sh",
                "-c",
                "echo stats | nc localhost 11211 | grep -q version"
            ]
        },
        initialDelaySeconds: 5,
        periodSeconds: 5,
        timeoutSeconds: 2,
        successThreshold: 1,
        failureThreshold: 3
    },
    livenessProbe: {
        exec: {
            command: [
                "sh",
                "-c",
                "echo stats | nc localhost 11211 | grep -q version"
            ]
        },
        initialDelaySeconds: 15,
        periodSeconds: 15,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
    },
    labels: [
        {
            "key": "app",
            "value": "memcached"
        },
        {
            "key": "tier",
            "value": "backend"
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
