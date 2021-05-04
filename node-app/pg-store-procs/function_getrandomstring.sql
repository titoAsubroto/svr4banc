CREATE OR REPLACE FUNCTION banc.getrandomstring(str_len integer)
  RETURNS text
  LANGUAGE plpgsql
AS
$body$
DECLARE
  charset text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,+,=}';
  random_string text := '';
  i integer := 0;
  len integer;
  
BEGIN
  if str_len < 0 then
    len := 15;
  else
    len := str_len;
  end if;
  
  for i in 1..len loop
    random_string := random_string || charset[1+random()*(array_length(charset, 1)-1)];
  end loop;
  
  return random_string;
END;
$body$
  VOLATILE
  COST 100;

COMMIT;