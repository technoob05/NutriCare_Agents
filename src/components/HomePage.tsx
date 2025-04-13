import React, { useState, useCallback, useEffect, useRef } from 'react';
@@ -42,7 +42,6 @@
     UtensilsCrossed, // Dinner
     Cookie,         // Snacks
     Soup,           // Lunch
-    

@@ -1224,16 +1223,6 @@
                     }}
                 >
                     {/* Clear Chat History Button */}
-                    <Link href="/profile" passHref>
-                        <Button variant="ghost" className="w-full justify-start">
-                            <Settings className="mr-2 h-4 w-4" />
-                            Cài đặt
-                        </Button>
-                    </Link>
-
-
-
-
                     {chatHistory.length > 0 && (
                         <Button 
                             variant="ghost" 

