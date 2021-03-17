var pcajs=function(){"use strict";function r(r,n,e,t,o,u,i){try{var c=r[u](i),a=c.value}catch(r){return void e(r)}c.done?n(a):Promise.resolve(a).then(t,o)}function n(n){return function(){var e=this,t=arguments;return new Promise((function(o,u){var i=n.apply(e,t);function c(n){r(i,o,u,c,a,"next",n)}function a(n){r(i,o,u,c,a,"throw",n)}c(void 0)}))}}function e(r,n,e){return n in r?Object.defineProperty(r,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):r[n]=e,r}function t(r,n){var e=Object.keys(r);if(Object.getOwnPropertySymbols){var t=Object.getOwnPropertySymbols(r);n&&(t=t.filter((function(n){return Object.getOwnPropertyDescriptor(r,n).enumerable}))),e.push.apply(e,t)}return e}function o(r){for(var n=1;n<arguments.length;n++){var o=null!=arguments[n]?arguments[n]:{};n%2?t(Object(o),!0).forEach((function(n){e(r,n,o[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(r,Object.getOwnPropertyDescriptors(o)):t(Object(o)).forEach((function(n){Object.defineProperty(r,n,Object.getOwnPropertyDescriptor(o,n))}))}return r}function u(r){return function(r){if(Array.isArray(r))return i(r)}(r)||function(r){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(r))return Array.from(r)}(r)||function(r,n){if(!r)return;if("string"==typeof r)return i(r,n);var e=Object.prototype.toString.call(r).slice(8,-1);"Object"===e&&r.constructor&&(e=r.constructor.name);if("Map"===e||"Set"===e)return Array.from(r);if("Arguments"===e||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e))return i(r,n)}(r)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function i(r,n){(null==n||n>r.length)&&(n=r.length);for(var e=0,t=new Array(n);e<n;e++)t[e]=r[e];return t}var c=function(r){return Array.isArray(r)?r:[r]},a=function(r){return c(r).join(",")},s=function(r){var n=[];return Object.keys(r).forEach((function(e){n.push.apply(n,u(f(e,c(r[e]))))})),"?"+n.join("&")},f=function(r,n){var e=[];return function(r){return"join"!==r&&"join"===r.substr(0,4)}(r)&&(r="join"),-1===["include","exclude","page","join"].indexOf(r)?n.forEach((function(n){e.push(r+"="+n)})):e=[r+"="+n.join(",")],e};return function(r){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},t={},i=function(r,n){var u=o(o({method:r},e),{},{headers:o(o({},t),e.headers)});return n&&(u.body=n instanceof FormData?n:JSON.stringify(n)),u},c=function(n){return[r].concat(u(n)).join("/")},f=function(r,e,t){return fetch(c(t),i(r,e)).then(function(){var r=n(regeneratorRuntime.mark((function r(n){var e;return regeneratorRuntime.wrap((function(r){for(;;)switch(r.prev=r.next){case 0:return r.next=2,n.json();case 2:return e=r.sent,r.abrupt("return",200===n.status||n.ok?Promise.resolve(e):Promise.reject(e));case 4:case"end":return r.stop()}}),r)})));return function(n){return r.apply(this,arguments)}}()).catch((function(r){return Promise.reject(r.code?r:{code:-1,message:r.message})}))},l=function(r,n){return f("POST",n,["records",r])},p=function(r,n,e){return f("GET",null,["records",r,a(n),s(e)])},d=function(r,n){var e=n?s(n):"",t=["records",r];return""!==e&&t.push(e),f("GET",null,t)};return{list:function(r){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return d(r,n)},read:function(r,n){var e=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};return p(r,n,e)},create:function(r,n){return l(r,n)},update:function(r,n,e){return f("PUT",e,["records",r,a(n)])},delete:function(r,n){return f("DELETE",null,["records",r,a(n)])},register:function(r,n){return f("POST",{username:r,password:n},["register"])},login:function(r,n){return f("POST",{username:r,password:n},["login"])},logout:function(){return f("POST",{},["logout"])},password:function(r,n,e){return f("POST",{username:r,password:n,newPassword:e},["password"])},me:function(){return f("GET",null,["me"])}}}}();