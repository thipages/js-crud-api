# pcajs

JavaScript API for [PHP-CRUD-API](https://github.com/mevdschee/php-crud-api)


# Installation


- via npm : _npm i pcajs_

```javascript
import pcajs from 'pcajs';
const pca=pcajs('urlToApi.php');
pca.read('aTable');
```
- via HTML
```html
<script src="min.js"></script>
<script>
    const pca=pcajs('urlToApi.php');
    pca.read('aTable');
</script>
```

# Promise-based
All functions (see API) are promise-based
```javascript
    pca.create('atable', {field:'value'}).then(
        result=>console.log(result)    
    ).catch (
        error=>console.log(error)
    );   
```
## API

pcajs access crud-php-api with the following functions

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
|                               | [other list conditions here](#list-conditions))
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




## list conditions
Conditions are stored as object properties, values as (array of) string/number

- **FILTERING**
  ```javascript
  pca.read('aTable', {filter:'field,modifier,value'});
  or 
  pca.read('aTable', {filter:['field1,modifier1,value1','field2,modifier2,value2']}); // AND
  or
  pca.read('aTable', {filter:'field1,modifier1,value1',filter1:'field2,modifier2,value2'}); // OR
  ```
  <ins>Modifier lists</ins> : cs(contain string), sw(start with), ew(end with), eq(equal), lt(lower than), le(lower or equal), ge(greater or equal), gt(greater than), bt(between), in, is(is null)
  
- **JOINING** ([documentation](https://github.com/mevdschee/php-crud-api#joins))
    ```javascript
  pca.read('aTable', {join:'table1'});
  or 
  pca.read('aTable', {join:'table1,table2'}); // nested join
  or
  pca.read('aTable', {join:['table1','table2']}); // nested join
  or
  pca.read('aTable', {join:'table1',joinx:'table2'}); // nested join + same level join
  // x being whatever character (join1, join2, ....)
  ```
  
  **Note** : the latter case is handle differently compared to the original php-crud-api library, but is somehow homegeneous with the OR filter syntax


- **SIZING**
    ```javascript
  pca.read('aTable', {size:10});
  ```
- **PAGINATING**
  ```javascript
  pca.read('aTable', {page:'1,50'});
  pca.read('aTable', {page:1});
  ```
- **COLUMN SELECTION**
    ```javascript
  pca.read('aTable', {include:'field'});
  or
  pca.read('aTable', {include:['field1,field2']});
  or
  pca.read('aTable', {exclude:['field1']});
  ```
- **ORDERING**
  ```javascript
  pca.read('aTable', {order:'field,desc'});
  or
  pca.read('aTable', {order:['field1,desc','field2']});
  ```

## Limitations

- Endpoints not (yet) implemented
  * /openapi
  * /geojson
  * /columns
  * /status/ping
  
- Only DBAuth is implemented (not basic and JWT ones)

## Tests

- on PHP-CRUD-API v2.11.2
- on SQLite 3.35.1 only




