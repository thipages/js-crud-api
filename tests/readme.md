### Tests issue
1. basic and authDB tests must share the same database otherwise when one test succeed, the other oe failed.
Repeating the failed test (eg dbAuth) several times allows it to succeed, but then the other one (basic) failed, ...

This seems to be cache problem ... not resolved

2. It is useful to catch php errors other than with -1 code and "Unexpected token < in JSON at position 0" message
