const castArray=(a)=>Array.isArray(a)?a:[a];
const toComma=a=>castArray(a).join(',');
const query=(o) => {
    let args=[];
    Object.keys(o).forEach((key)=> {
        let values=[];
        castArray(o[key]).forEach((item)=> {
            values.push(key+'='+item);
        });
        args.push(...values);
    });
    return '?'+args.join('&');
};
var index = (baseUrl, config={})=>{
    // todo headers Content-Type formalization? application/json vs multipart/form-data ...
    const headers = {};
    const _config = (method, body)=>{
        let c= {
            method: method,
            ...config,
            headers: {
                ...headers,
                ...config.headers,
            }
        };


        // todo do manage array of FormData?
        if (body) c.body=body instanceof FormData ? body :JSON.stringify(body);
        return c;
    };
    const url=(parts)=>[baseUrl,...parts].join('/');
    const _fetch=(method,body, parts)=> {
        return fetch(url(parts), _config(method, body))
            .then(async response =>{
                const data=await response.json();
                return (response.status === 200 || response.ok)
                    ? Promise.resolve(data)
                    : Promise.reject(data);
            }).catch (e=>{
                return Promise.reject(e.code?e:{code:-1, message:e.message})
            });
    };
    const _create=(tableName,data)=>_fetch('POST',data,['records',tableName]);
    const _read=(table, idsOrConditions)=> {
        let add= !idsOrConditions
            ? ''
            : Array.isArray(idsOrConditions)
                ? idsOrConditions.join(',')
                : typeof idsOrConditions === 'object'
                    ? idsOrConditions
                        ? query(idsOrConditions)
                        : ''
                    :idsOrConditions;
        let parts=['records',table];
        if (add!=='') parts.push(add);
        return _fetch('GET',null,parts);
    };
    return {
        read:(tableName,idsOrConditions)=>_read(tableName,idsOrConditions),
        select:(tableName,idsOrConditions)=>_read(tableName,idsOrConditions),
        list:(tableName)=>_read(tableName),
        create:(tableName,data)=>_create(tableName,data),
        insert:(tableName,data)=>_create(tableName,data),
        update:(tableName,idOrList,data)=>_fetch('PUT',data,['records',tableName,toComma(idOrList)]),
        delete:(tableName,idOrList)=>_fetch('DELETE',null,['records',tableName,toComma(idOrList)]),
        definition:()=>_fetch('GET',{},['openapi']),
        register:(username,password)=>_fetch('POST', {username,password},['register']),
        login:(username,password)=>_fetch('POST', {username,password},['login']),
        logout:()=>_fetch('POST',{},['logout']),
        me:()=>_fetch('GET',null,['me'])
    };
};

export default index;
