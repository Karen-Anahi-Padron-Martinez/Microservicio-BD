// Pipeline de BASE DE DATOS: lint SQL -> pruebas sobre BD temporal -> SonarQube -> Quality Gate
pipeline {
    agent any

    options {
        timestamps()
        // Un solo checkout (etapa Checkout) en lugar de dos, con reintentos ante fallos de red
        skipDefaultCheckout()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    environment {
        // MariaDB accesible por la red Docker devops-net
        DB_HOST = 'mariadb-container'
        DB_PORT = '3306'
        REQUIERE_BD = '1'
    }

    stages {
        stage('Checkout') {
            steps {
                retry(3) {
                    checkout scm
                }
            }
        }

        stage('Instalar dependencias') {
            steps {
                nodejs(nodeJSInstallationName: 'NodeJS22') {
                    sh 'node -v && npm -v'
                    sh 'npm ci --no-audit --no-fund'
                }
            }
        }

        stage('Validación / lint SQL') {
            steps {
                nodejs(nodeJSInstallationName: 'NodeJS22') {
                    sh 'npm run lint:sql'
                }
            }
        }

        stage('Pruebas sobre BD temporal') {
            steps {
                // Usuario de CI con permisos solo sobre las BD dbgestor_ci_*; la credencial vive en Jenkins
                withCredentials([usernamePassword(credentialsId: 'mariadb-ci', usernameVariable: 'DB_USER', passwordVariable: 'DB_PASSWORD')]) {
                    nodejs(nodeJSInstallationName: 'NodeJS22') {
                        sh 'npm run test:ci'
                    }
                }
            }
            post {
                always {
                    // Reporte HTML de cobertura de la capa Node (coverage/lcov-report/index.html)
                    archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('Análisis SonarQube') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv('sonar') {
                        nodejs(nodeJSInstallationName: 'NodeJS22') {
                            sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectVersion=${env.BUILD_NUMBER}"
                        }
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'sql/*.sql', allowEmptyArchive: false
        }
    }
}
