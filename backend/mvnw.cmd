@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_ARG0_NAME__%"=="" (SET "__MVNW_ARG0_NAME__=%~nx0")
@SET __ MVNW_CMD__=%COMSPEC%
@IF NOT "%COMSPEC%"=="" @IF NOT "%COMSPEC:cmd.exe=%"=="%COMSPEC%" @SET "__MVNW_CMD__=%COMSPEC%"

@SETLOCAL

@SET DIRNAME=%~dp0
@IF "%DIRNAME%"=="" @SET DIRNAME=.
@SET APP_BASE_NAME=%~n0

@REM Validate Java is available
@SETLOCAL EnableExtensions
@SET "JAVA_HOME_GUESS="
@IF EXIST "C:\Program Files\Java\jdk-21\bin\java.exe" (
    @SET "JAVA_EXEC=C:\Program Files\Java\jdk-21\bin\java.exe"
) ELSE (
    @FOR /F "tokens=* USEBACKQ" %%F IN (`where java 2^>NUL`) DO @SET "JAVA_EXEC=%%F"
)

@REM Find the project root
@IF "%DIRNAME:~-1%"=="\" SET DIRNAME=%DIRNAME:~0,-1%
@SET MAVEN_PROJECTBASEDIR=%DIRNAME%
@SET WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
@IF NOT DEFINED MAVEN_OPTS SET MAVEN_OPTS=

@SET WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

@IF NOT EXIST %WRAPPER_JAR% (
    @ECHO Maven Wrapper JAR not found. Please run: powershell -Command "Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar' -OutFile '.mvn\wrapper\maven-wrapper.jar'"
    @EXIT /B 1
)

"%JAVA_EXEC%" %MAVEN_OPTS% -classpath %WRAPPER_JAR% "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" %WRAPPER_LAUNCHER% %*

@IF "%ERRORLEVEL%"=="0" @GOTO end
@SET ERROR_CODE=%ERRORLEVEL%

:end
@ENDLOCAL & @SET ERROR_CODE=%ERROR_CODE%
@EXIT /B %ERROR_CODE%
