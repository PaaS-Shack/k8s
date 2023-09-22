/**
 * This is a definition of the wordpress image.
 * 
 * wordpress:php8.2-apache
 * DIGEST:sha256:a4e7aecf85e11d30205ebcc72de0326bbb52043578945a2816775ab4dc257bec
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "wordpress-php8-2-apache",
    namespace:"library",
    tag: "php8.2-apache",
    digest: "sha256:a4e7aecf85e11d30205ebcc72de0326bbb52043578945a2816775ab4dc257bec",
    image: "wordpress:php8.2-apache",
    registry: "docker.io",
    repository: "library/wordpress",
    description: "WordPress is open source software you can use to create a beautiful website, blog, or app.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 80,
            protocol: "HTTP"
        }
    ],
    env: [
        {
            key: "mysql.provisions",
            type: "provision"
        },
        {
            key: "WORDPRESS_DB_HOST",
            type: "map",
            value: "MYSQL_HOST,MYSQL_PORT"
        },
        {
            key: "WORDPRESS_DB_USER",
            type: "map",
            value: "MYSQL_USERNAME"
        },
        {
            key: "WORDPRESS_DB_PASSWORD",
            type: "map",
            value: "MYSQL_PASSWORD"
        },
        {
            key: "WORDPRESS_DB_NAME",
            type: "map",
            value: "MYSQL_DATABASE"
        }
    ],
    volumes: [
        {
            name: "wordpress-data",
            type: "persistentVolumeClaim",
            mountPath: "/var/www/html"
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
            "value": "wordpress"
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
