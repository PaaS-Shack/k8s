
/**
 * This is a definition of the registry image.
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "registry",
    namespace:"library",
    tag: "2.7.1",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "registry:2.7.1",
    registry: "docker.io",
    repository: "library/registry",
    description: "Registry is a stateless, highly scalable server side application that stores and lets you distribute Docker images. This image is based on Alpine Linux.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 5000,
            protocol: "HTTP"
        }
    ],
    env: [
        {
            key: "REGISTRY_HTTP_ADDR",
            type: "route",
            value: "https://${VHOST}"
        },
        {
            key: "REGISTRY_HTTP_SECRET",
            type: "secret",
        },
    ],
    volumes: [
        {
            name: "registry-data",
            type: "persistentVolumeClaim",
            mountPath: "/var/lib/registry"
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
        httpGet: {
            path: "/v2/",
            port: 5000,
            scheme: "HTTP"
        },
        initialDelaySeconds: 5,
        periodSeconds: 5,
        timeoutSeconds: 2,
        successThreshold: 1,
        failureThreshold: 3
    },
    livenessProbe: {
        httpGet: {
            path: "/v2/",
            port: 5000,
            scheme: "HTTP"
        },
        initialDelaySeconds: 15,
        periodSeconds: 5,
        timeoutSeconds: 2,
        successThreshold: 1,
        failureThreshold: 3
    },
    labels:[
        {
            "key": "app",
            "value": "registry"
        },
        {
            "key": "tier",
            "value": "backend"
        }    
    ],
    annotations: [
        {
            "key": "app.kubernetes.io/managed-by",
            "value": "OneHost Operator"
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
}
