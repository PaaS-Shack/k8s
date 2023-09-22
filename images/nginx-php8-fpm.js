
/**
 * This is a definition of the tangramor/nginx-php8-fpm:php8.2.10_node20.6.0 image.
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");


module.exports = {
    name: "tangramor-nginx-php8-fpm",
    namespace:"tangramor",
    tag: "php8.2.10_node20.6.0",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "tangramor/nginx-php8-fpm:php8.2.10_node20.6.0",
    registry: "docker.io",
    repository: "tangramor/nginx-php8-fpm",
    description: "nginx-php8-fpm is a widely used, open-source nginx-php8-fpm management system (nginx-php8-fpm).",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "nginx-php8-fpm",
            port: 80,
            protocol: "HTTP"
        }
    ],
    env: [
        {
            key: "NGINX_PHP8_FPM_ROOT_PASSWORD",
            type: "secret"
        },
    ],
    volumes: [
        {
            name: "nginx-php8-fpm-data",
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
    readinessProbe: {
        exec: {
            command: [
                "nginx",
                "-t"
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
                "nginx",
                "-t"
            ]
        },
        initialDelaySeconds: 10,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
    },
    configMap: {
        "nginx.conf": `
user  nginx;
worker_processes  1;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;
events {
    worker_connections  1024;
}
http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for"';
    access_log  /var/log/nginx/access.log  main;
    sendfile        on;
    #tcp_nopush     on;
    keepalive_timeout  65;
    #gzip  on;
    include /etc/nginx/conf.d/*.conf;
}
`,
        "default.conf": `
server {
    listen       80;
    server_name  localhost;
    root   /var/www/html/public;
    index  index.php index.html index.htm;
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/var/run/php-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
`,
        "php.ini": `
[PHP]
engine = On
short_open_tag = Off
precision = 14
output_buffering = 4096
zlib.output_compression = Off
implicit_flush = Off
unserialize_callback_func =     
serialize_precision = -1
disable_functions = pcntl_alarm,pcntl_fork,pcntl_waitpid,pcntl_wait,pcntl_wifexited,pcntl_wifstopped,pcntl_wifsignaled,pcntl_wifcontinued,pcntl_wexitstatus,pcntl_wtermsig,pcntl_wstopsig,pcntl_signal,pcntl_signal_get_handler,pcntl_signal_dispatch,pcntl_get_last_error,pcntl_strerror,pcntl_sigprocmask,pcntl_sigwaitinfo,pcntl_sigtimedwait,pcntl_exec,pcntl_getpriority,pcntl_setpriority,    
disable_classes =   
zend.enable_gc = On
expose_php = Off
max_execution_time = 30
max_input_time = 60
memory_limit = 128M
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT
display_errors = Off
display_startup_errors = Off
log_errors = On
log_errors_max_len = 1024
ignore_repeated_errors = Off
ignore_repeated_source = Off
report_memleaks = On
html_errors = On
variables_order = "GPCS"
request_order = "GP"
register_argc_argv = Off
`,
    },
}