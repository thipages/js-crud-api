# js-crud-api

JavaScript API for [php-crud-api](https://github.com/mevdschee/php-crud-api)


# Installation


- via npm : _npm i js-crud-api_

```javascript
import jscrudapi from 'js-crud-api';
const jca=jscrudapi('urlToApi.php');
jca.read('aTable');
```
- via HTML
```html
<script src="min.js"></script>
<script>
    const jca=jscrudapi('urlToApi.php');
    jca.read('aTable');
</script>
```

# Promise-based
All functions (see API) are promise-based
```javascript
    jca.create('atable', {field:'value'}).then(
        result=>console.log(result)    
    ).catch (
        error=>console.log(error)
    );   
```
## API

js-crud-api access crud-php-api with the following functions

- **CRUD functions**

| CRUD functions                   | examples                       |
| ----------------------------- | ------------------------------ |
| read (table,ids, joins={})    | ```read('atable', 1)```        |
|                               | ```read('atable', '1,2')```    |
|                               | ```read('atable', [1,2])```    |
|                               | ```read('atable', 1,{join:'anotherTable'})```    |
| list (table, conditions={})   | ```list('atable')```           |
|                               | ```list('atable', {filter:'id eq 1'})``` |
|                               | ```list('atable', {filter:['id eq 1','id eq 2']})``` |
|                               | [other list conditions here](#list-conditions)
| create (table,data)           | ```create('atable', {field:'value'})```      |
|                               | ```create('atable', [{field:'value1'},{field:'value2'}])```      |
| update (table,idOrList,data)  | ```update('atable',1 {field:'newValue'})```      |
|                               | ```update('atable','1,2' [{field:'newValue1'},{field:'newValue2'}])```      |
|                               | ```update('atable',[1,2] [{field1:'newValue1'},{field2:'newValue2'}])```      |
| delete (table,idOrList)       | ```delete('atable',1)```      |
|                               | ```delete('atable','1,2')```  |
|                               | ```delete('atable',[1,2])```  |

- **Authentication functions** ([see documentation](https://github.com/mevdschee/php-crud-api#database-authentication))

  * ```register(username,password)```
  * ```login (username,password)```
  * ```password (username,password,newPassowrd)```
  * ```logout()```
  * ```me()```




## list/read conditions
Conditions are stored as object properties, values as (array of) string/number

- **FILTERING** ([documentation](https://github.com/mevdschee/php-crud-api#filters))
  ```javascript
  jca.read('aTable', {filter:'field,modifier,value'});
  jca.read('aTable', {filter:['field1,modifier1,value1','field2,modifier2,value2']}); // AND
  jca.read('aTable', {filter:'field1,modifier1,value1',filter1:'field2,modifier2,value2'}); // OR
  ```
  <ins>filters</ins>
  * cs(contain string), sw(start with), ew(end with), eq(equal), lt(lower than), le(lower or equal), ge(greater or equal), gt(greater than), bt(between), in, is(is null)
  * filters can be negated by prepending a "n" character (eg "eq" becomes "neq")
  
- **JOINING** ([documentation](https://github.com/mevdschee/php-crud-api#joins))
    ```javascript
  jca.read('aTable', {join:'table1'});
  jca.read('aTable', {join:'table1,table2'}); // nested join
  jca.read('aTable', {join:['table1','table2']}); // nested join
  jca.read('aTable', {join:'table1',joinx:'table2'}); // nested join + same level join
  // x being whatever character (eg join1, join2, ....)
  ```
  
  **Note** : the latter case is handle differently compared to the original php-crud-api library, but is somehow homegeneous with the OR filter syntax


- **SIZING**
  ```javascript
  jca.read('aTable', {size:10});
  ```
- **PAGINATING**
  ```javascript
  jca.read('aTable', {page:'1,50'});
  jca.read('aTable', {page:1});
  ```
- **COLUMN SELECTION**
    ```javascript
  jca.read('aTable', {include:'field'});
  jca.read('aTable', {include:['field1,field2']});
  jca.read('aTable', {exclude:['field1']});
  ```
- **ORDERING**
  ```javascript
  jca.read('aTable', {order:'field,desc'});
  jca.read('aTable', {order:['field1,desc','field2']});
  ```

## Limitations

- Endpoints not (yet) implemented
  * /openapi
  * /geojson
  * /columns
  * /status/ping
  
- Only DBAuth is implemented (not basic and JWT authentications)

## Tests

- on php-crud-api v2.11.2
- on SQLite 3.35.1 only




