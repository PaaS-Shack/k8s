/**
 * This is a definition of the wordpress image.
 * 
 * docker pull ghcr.io/requarks/wiki:3.0.0-alpha.309
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "wikijs-2",
    namespace: "requarks",
    tag: "3.0.0-alpha.309",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "ghcr.io/requarks/wiki:3.0.0-alpha.309",
    registry: "ghcr.io",
    repository: "requarks/wiki",
    description: "A modern, lightweight and powerful wiki app built on NodeJS, Git and Markdown",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 3000,
            protocol: "HTTP"
        }
    ],
    env: [
        {
            key: "mysql.provisions",
            type: "provision"
        },
        {
            key: "DB_TYPE",
            type: "value",
            value: "mysql"
        },
        {
            key: "DB_HOST",
            type: "map",
            value: "MYSQL_HOST"
        },
        {
            key: "DB_PORT",
            type: "map",
            value: "MYSQL_PORT"
        },
        {
            key: "DB_USER",
            type: "map",
            value: "MYSQL_USERNAME"
        },
        {
            key: "DB_PASS",
            type: "map",
            value: "MYSQL_PASSWORD"
        },
        {
            key: "DB_NAME",
            type: "map",
            value: "MYSQL_DATABASE"
        },
        {
            key: "DB_SSL",
            type: "value",
            value: "false"
        }
    ],
    volumes: [
        {
            name: "wikijs-data",
            type: "persistentVolumeClaim",
            mountPath: "/var/wiki"
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
    labels:[
        {
            "key": "app",
            "value": "wikijs"
        },
        {
            "key": "tier",
            "value": "frontend"
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
