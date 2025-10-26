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
  --filter             Filter results by a specific field
                       (format: filter-name=filter-value).
                       Can be used multiple times for different filters
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

#### Using filters

The `--filter` option allows you to filter geocoding results by specific fields supported by your addok instance. The format is `--filter filter-name=column-name`, where `filter-name` is the filter accepted by addok and `column-name` is the column in your CSV file.

You can use multiple filters:

```bash
# Filter by citycode
cat addresses.csv | addok-geocode --columns address --filter citycode=code_insee > geocoded.csv

# Filter by postcode
cat addresses.csv | addok-geocode --columns address --filter postcode=cp > geocoded.csv

# Use multiple filters
cat addresses.csv | addok-geocode --columns address --filter citycode=code_insee --filter type=address_type > geocoded.csv
```

##### Multiple values with OR operator

A column can contain multiple values separated by `+`, which will be combined with an OR operator:

```bash
# If your CSV has a column "codes" with values like "75001+75002+75003"
cat addresses.csv | addok-geocode --columns address --filter citycode=codes > geocoded.csv
```

This will search for addresses matching citycode 75001 OR 75002 OR 75003.

**Note:** The available filters depend on your addok instance configuration. Common filters include `citycode`, `postcode`, `type`, but your instance may support additional custom filters.
