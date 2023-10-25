/**
 * This is a definition of the phpbb image.
 * 
 * docker pull bitnami/phpbb/3.3.11
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "phpbb-3",
    namespace: "bitnami",
    tag: "3.3.11",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "docker.io/bitnami/phpbb:3.3.11",
    registry: "docker.io",
    repository: "bitnami/phpbb",
    description: "PHPBB is an Internet forum package written in the PHP scripting language. The name \"phpBB\" is an abbreviation of PHP Bulletin Board. Available in more than 50 languages, phpBB is one of the most popular open-source bulletin board package in the world. phpBB has a user-friendly interface, simple and straightforward administration panel, and helpful FAQ. Based on the powerful PHP server language and your choice of MySQL, MS-SQL, PostgreSQL or Access/ODBC database servers, phpBB is the ideal free community solution for all web sites.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 8080,
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
            value: "mysql"
        },
        {
            key: "PHPBB_DATABASE_HOST",
            type: "map",
            value: "MYSQL_HOST"
        },
        {
            key: "PHPBB_DATABASE_PORT_NUMBER",
            type: "map",
            value: "MYSQL_PORT"
        },
        {
            key: "PHPBB_DATABASE_NAME",
            type: "map",
            value: "MYSQL_DATABASE"
        },{
            key: "PHPBB_DATABASE_USER",
            type: "map",
            value: "MYSQL_USERNAME"
        },
        {
            key: "PHPBB_DATABASE_PASSWORD",
            type: "map",
            value: "MYSQL_PASSWORD"
        }
    ],
    volumes: [
        {
            name: "phpbb-data",
            type: "persistentVolumeClaim",
            mountPath: "/bitnami/phpbb"
        }
    ],
    resources: {
        requests: {
            cpu: 50,
            memory: 128
        },
        limits: {
            cpu: 300,
            memory: 512
        }
    },
    labels:[
        {
            "key": "app",
            "value": "phpbb"
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
