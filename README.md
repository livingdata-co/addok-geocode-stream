# addok-geocode-stream
Node.js stream API for addok geocoder

## Usage

### CLI

#### Installation

```
npm install -g addok-geocode-stream
```

#### Documentation

```
$ addok-geocode --help
addok-geocode [options]

Options:
  --help               Show help                                       [boolean]
  --version            Show version number                             [boolean]
  --reverse            Reverse mode                                    [boolean]
  --service            Set geocoding service URL
                                   [default: "https://api-adresse.data.gouv.fr"]
  --strategy           Set geocoding strategy: csv, batch or cluster
                                                                [default: "csv"]
  --columns            Select columns to geocode, in the right order
  --citycode           Filter results by citycode
  --postcode           Filter results by postcode
  --lon                Define longitude column (geo affinity)
  --lat                Define latitude column (geo affinity)
  --semicolon, --semi  Use semicolon (;) as separator                  [boolean]
  --tab                Use tabulation as separator                     [boolean]
  --pipe               Use pipe as separator                           [boolean]
  --result             Select columns you want to be added to the result by the
                       geocoder. Default: all
  --bucket             Set how many rows are sent in each request
                                                         [number] [default: 200]
  --concurrency        Set how many requests must be executed concurrently
                                                                        [number]
  --encoding           Set data encoding. Can be detected automatically
                                                     [choices: "utf8", "latin1"]
  --clusterConfig      Path to addok config module (addok.conf)
```

#### Example

```bash
cat my-addresses.csv | addok-geocode --columns numero,voie,code_postal,ville --semicolon > my-geocoded-addresses.csv
```
