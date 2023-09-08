
/**
 * This is a definition of the wordpress image.
 * 
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "wordpress",
    namespace:"library",
    tag: "5.2.2-php7.3-apache",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "wordpress:5.2.2-php7.3-apache",
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
            key: "mysql",
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
            value: "MYSQL_USER"
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
        },
        {
            name: "wordpress-config",
            type: "configMap",
            mountPath: "/var/www/html/wp-config.php",
            subPath: "wp-config.php"
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
            path: "/",
            port: 80,
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
            path: "/",
            port: 80,
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
