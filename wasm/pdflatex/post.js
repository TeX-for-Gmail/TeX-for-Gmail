// Avoid conflict with actual promise
Module['then2'] = Module['then'];
delete Module['then'];
