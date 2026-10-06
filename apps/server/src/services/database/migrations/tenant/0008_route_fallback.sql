update "message" set "route" = json_set("route", '$.via', 'jev') where json_extract("route", '$.via') = 'fallback';
