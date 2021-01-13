# ChillImport [![Build Status](https://api.travis-ci.com/FraunhoferIOSB/ChillImport.svg?branch=master)](https://travis-ci.com/FraunhoferIOSB/ChillImport) [![codecov](https://codecov.io/gh/FraunhoferIOSB/ChillImport/branch/master/graph/badge.svg)](https://codecov.io/gh/FraunhoferIOSB/ChillImport) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/6810ee95249341248d1e696a3b177101)](https://www.codacy.com/gh/FraunhoferIOSB/ChillImport?utm_source=github.com&utm_medium=referral&utm_content=FraunhoferIOSB/ChillImport&utm_campaign=Badge_Grade) [![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=FraunhoferIOSB/ChillImport)](https://dependabot.com)

<img src="https://github.com/FraunhoferIOSB/ChillImport/blob/master/src/main/resources/static/images/logo.png" width="439" height="80"></img>\
ChillImport is a Software with which you can easily import your sensor measurements
from csv or excel files \
into a [FROST-Server](https://github.com/FraunhoferIOSB/FROST-Server). It offers
you an userfriendly, web-based gui.

## Downloading

The easiest way to obtain and run the software is docker:\
<https://hub.docker.com/r/fraunhoferiosb/chillimport>

If you've Docker installed, simply run
`docker run -p 8000:8000 fraunhoferiosb/chillimport` and you can access
ChillImport on [http://localhost:8000](http://localhost:8000).

## Setup

Before starting the software you have to create an environment-variable
"configPath", \
it defines the path to your configuration and log-files. By default the path is "/data".
\
\
To use this software you need a FROST-Server.\
For more details visit the
[FROST-Server github page](https://github.com/FraunhoferIOSB/FROST-Server).

## Importing Data

ChillImport offers you an easy and guided usage for all your imports. \
It is possible to import data from excel and csv files.\
If needed you can also create new entities on your FROST-Server, eg:

- Things
- Locations
- Datastreams
- Sensors
- Observed-Properies

This makes the use of ChillImport more convenient. \
\
\
For more information you can find example-imports here: [ChillImport example](Example/ImportExample01.md)

## Screenshot

![](Example/screenshot.png)

## Creating a suitable DateTime format

Every Observation needs a timestamp to be imported (step 3 point 5). So it is
necessary that you can create the right pattern for your Date and Time format.\
This paragraph exists to help you with that. \
\
We start with a scenario where you have timestamps like this:\
31.03.2020 15:30 \
25.05.2019 18:29 \
... and so on. It is easy to see, that the dates start with two digits standing
for the day of the month.\
Our format begins with "dd". After the days is a point, followed by two digits determine
the month.\
Now the format looks like this: dd.MM \ Following this logic we end up with:
dd.MM.yyyy HH:mm (don't forget the space between the date and the time).\
\
To get a better understanding of the underlying logic we consider another
example:\
25/11/2019 10:05\
22/5/2019 8:31\
You should notice that this example is a bit more difficult. If we take the first
timestamp and search a pattern for it we would get a format like this "dd/MM/yy HH:mm".
This format won´t fit for our 2nd row "22/5/19 8:31", since there is not the right
amount of digits for months and hours.\
To understand why this error occurs and how you can fix it you need some
information about the DateTimeFormatter we used in Chillimport: \
If you type MM, the Formatter will expect two digits determine the month, but \
if you use a single M, the Formatter will accept every format which can be used
to describe a Month.\
The same logic applies to hours (H), to years (y) and so on. \
(If you want to know more about this or see a table with patterns you can read
the
[Java docs](https://docs.oracle.com/javase/8/docs/api/java/time/format/DateTimeFormatterBuilder.html#appendPattern-java.lang.String-).)
\
A format that satisfies these conditions would be: d/M/y H:m \
\
You can also use a shortened pattern for our first example: d.M.y H:m. \
Use what you prefer.
