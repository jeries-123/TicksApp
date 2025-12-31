<?php
   function OpenConnection(){
      $host = getenv("DB_HOST") ?: "localhost";
      $username = getenv("DB_USER") ?: "aiiovdft_lms";
      $password = getenv("DB_PASSWORD") ?: "strong#dux13";
      $dbname = getenv("DB_NAME") ?: "aiiovdft_tickprediction";
      
      $conn = new mysqli($host, $username, $password, $dbname) or die("Connection to database failed: %s\n". $conn -> error);

      return $conn;
   }
 
   function CloseConnection($conn){
      $conn -> close();
   }
