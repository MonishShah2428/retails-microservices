pipeline {
  agent any

  environment {
    DOCKERHUB_USER = 'fierypriest'
    APP_EC2_IP     = '3.93.119.86'
    IMAGE_TAG      = "${env.BUILD_NUMBER}"
  }

  stages {

    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build') {
      steps {
        sh './gradlew clean build -x test'
      }
    }

    stage('Docker Build & Push') {
      steps {
        withCredentials([usernamePassword(
            credentialsId: 'dockerhub-creds',
            usernameVariable: 'DH_USER',
            passwordVariable: 'DH_PASS')]) {
          script {
            def services = [
              [name: 'product-service',           dir: 'microservices/product-service'],
              [name: 'recommendation-service',    dir: 'microservices/recommendation-service'],
              [name: 'review-service',            dir: 'microservices/review-service'],
              [name: 'product-composite-service', dir: 'microservices/product-composite-service'],
              [name: 'config-server',             dir: 'discovery/config'],
              [name: 'eureka-server',             dir: 'discovery/netflix'],
              [name: 'gateway',                   dir: 'discovery/edge'],
            ]
            services.each { svc ->
              sh """
                echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                docker build \\
                  -t ${DOCKERHUB_USER}/${svc.name}:${IMAGE_TAG} \\
                  -t ${DOCKERHUB_USER}/${svc.name}:latest \\
                  ${svc.dir}
                docker push ${DOCKERHUB_USER}/${svc.name}:${IMAGE_TAG}
                docker push ${DOCKERHUB_USER}/${svc.name}:latest
              """
            }
          }
        }
      }
    }

    stage('Deploy to App EC2') {
      steps {
        sshagent(credentials: ['app-ec2-ssh-key']) {
          sh """
            ssh -o StrictHostKeyChecking=no ubuntu@${APP_EC2_IP} \\
              "cd /opt/retail-microservices \\
               && git pull \\
               && DOCKERHUB_USER=${DOCKERHUB_USER} IMAGE_TAG=${IMAGE_TAG} \\
                  docker compose -f docker-compose.prod.yml pull \\
               && DOCKERHUB_USER=${DOCKERHUB_USER} IMAGE_TAG=${IMAGE_TAG} \\
                  docker compose -f docker-compose.prod.yml up -d --remove-orphans"
          """
        }
      }
    }
  }

  post {
    always {
      sh 'docker logout || true'
    }
    success {
      echo "Build ${IMAGE_TAG} deployed to ${APP_EC2_IP} successfully."
    }
    failure {
      echo "Pipeline failed at build ${IMAGE_TAG}. Check logs above."
    }
  }
}
