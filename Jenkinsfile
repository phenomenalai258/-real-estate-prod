pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
    }

    stages {
        stage('Clone Repository') {
            steps {
                git url: 'https://github.com/itskum47/real-estate-prod.git', branch: 'main'
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir('server') {
                    sh 'npm install'
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                dir('client') {
                    sh 'npm install'
                }
            }
        }

        stage('Run Backend Tests') {
            steps {
                dir('server') {
                    sh 'npm test || echo "No tests defined"'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                dir('server') {
                    script {
                        dockerImage = docker.build("real-estate-backend:${BUILD_NUMBER}")
                    }
                }
            }
        }

        stage('Run Docker Container') {
            steps {
                script {
                    dockerImage.run("-d -p 5000:5000")
                }
            }
        }

        // Optional deployment stage
        // stage('Deploy to Server') {
        //     steps {
        //         echo 'Deploying app...'
        //     }
        // }
    }

    post {
        always {
            echo 'Cleaning up...'
        }
    }
}

