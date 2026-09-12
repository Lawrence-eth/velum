// Strict RFC-style CSV parser: quoted commas/newlines and escaped quotes; bounded before parsing.
export function parseCsv(input: string): string[][] {
 if(new TextEncoder().encode(input).length>16384)throw new Error('CSV must be at most 16 KB');
 input=input.replace(/^\uFEFF/,'');const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
 const finish=()=>{row.push(field);field='';closed=false;};
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(quoted){if(c==='"'){if(input[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'){if(field||closed)throw new Error('Unexpected quote in CSV');quoted=true;continue;}
  if(c===','){finish();continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;finish();rows.push(row);row=[];continue;}
  if(closed)throw new Error('Unexpected text after CSV quote');field+=c;
 }
 if(quoted)throw new Error('Unclosed CSV quote');if(field||row.length||closed){finish();rows.push(row);}
 if(rows.some(r=>r.length===1&&r[0]===''))throw new Error('Remove blank CSV rows');
 return rows;
}
