CP=""

CP=$CP:/ratings-load/log4j-1.2.7.jar
CP=$CP:/ratings-load/ifxjdbc.jar
CP=$CP:/ratings-load/classes
CP=$CP://ratings-load/shared.jar

java -cp $CP com.topcoder.shared.util.dwload.TCLoadUtility -xmlfile loadlong.xml