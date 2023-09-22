/**
 * This is a definition of the mysql v5 image.
 * 
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "mysql",
    namespace:"library",
    tag: "5.7.27",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "mysql:5.7.27",
    registry: "docker.io",
    repository: "library/mysql",
    description: "MySQL is a widely used, open-source relational database management system (RDBMS).",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "mysql",
            port: 3306,
            protocol: "TCP"
        }
    ],
    env: [
        {
            key: "MYSQL_ROOT_PASSWORD",
            type: "secret"
        },
    ],
    volumes: [
        {
            name: "mysql-data",
            type: "persistentVolumeClaim",
            mountPath: "/var/lib/mysql"
        },
        {
            name: "mysql-config",
            type: "configMap",
            mountPath: "/etc/mysql/conf.d"
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
                "mysql",
                "-u",
                "root",
                "-p${MYSQL_ROOT_PASSWORD}",
                "-e",
                "SELECT 1"
            ]
        },
        initialDelaySeconds: 5,
        periodSeconds: 5,
        timeoutSeconds: 1,
        successThreshold: 1,
        failureThreshold: 3
    },
    livenessProbe: {
        exec: {
            command: [
                "mysql",
                "-u",
                "root",
                "-p${MYSQL_ROOT_PASSWORD}",
                "-e",
                "SELECT 1"
            ]
        },
        initialDelaySeconds: 15,
        periodSeconds: 5,
        timeoutSeconds: 1,
        successThreshold: 1,
        failureThreshold: 3
    },
    labels:[
        {
            "key": "app",
            "value": "mysql"
        },
        {
            "key": "tier",
            "value": "database"
        }
    ],
    configMap: {
        "mysql.cnf": `
# Apply this config only on the leader.
[mysqld]
sql_mode="NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION"`,
    },
    affinity: {
        nodeAffinity: {
            requiredDuringSchedulingIgnoredDuringExecution: {
                nodeSelectorTerms: [
                    {
                        matchExpressions: [
                            {
                                key: "k8s.one-host.ca/role-database",
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