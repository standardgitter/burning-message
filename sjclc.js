"use strict";var sjcl={cipher:{},hash:{},keyexchange:{},mode:{},misc:{},codec:{},exception:{corrupt:function(message){this.toString=function(){return"CORRUPT: "+this.message};this.message=message},invalid:function(message){this.toString=function(){return"INVALID: "+this.message};this.message=message},bug:function(message){this.toString=function(){return"BUG: "+this.message};this.message=message},notReady:function(message){this.toString=function(){return"NOT READY: "+this.message};this.message=message}}};sjcl.bitArray={bitSlice:function(a,bstart,bend){a=sjcl.bitArray._shiftRight(a.slice(bstart/32),32-(bstart&31)).slice(1);return(bend===undefined)?a:sjcl.bitArray.clamp(a,bend-bstart)},extract:function(a,bstart,blength){var x,sh=Math.floor((-bstart-blength)&31);if((bstart+blength-1^bstart)&-32){x=(a[bstart/32|0]<<(32-sh))^(a[bstart/32+1|0]>>>sh)}else{x=a[bstart/32|0]>>>sh}return x&((1<<blength)-1)},concat:function(a1,a2){if(a1.length===0||a2.length===0){return a1.concat(a2)}var last=a1[a1.length-1],shift=sjcl.bitArray.getPartial(last);if(shift===32){return a1.concat(a2)}else{return sjcl.bitArray._shiftRight(a2,shift,last|0,a1.slice(0,a1.length-1))}},bitLength:function(a){var l=a.length,x;if(l===0){return 0}x=a[l-1];return(l-1)*32+sjcl.bitArray.getPartial(x)},clamp:function(a,len){if(a.length*32<len){return a}a=a.slice(0,Math.ceil(len/32));var l=a.length;len=len&31;if(l>0&&len){a[l-1]=sjcl.bitArray.partial(len,a[l-1]&2147483648>>(len-1),1)}return a},partial:function(len,x,_end){if(len===32){return x}return(_end?x|0:x<<(32-len))+len*1099511627776},getPartial:function(x){return Math.round(x/1099511627776)||32},equal:function(a,b){if(sjcl.bitArray.bitLength(a)!==sjcl.bitArray.bitLength(b)){return false}var x=0,i;for(i=0;i<a.length;i++){x|=a[i]^b[i]}return(x===0)},_shiftRight:function(a,shift,carry,out){var i,last2=0,shift2;if(out===undefined){out=[]}for(;shift>=32;shift-=32){out.push(carry);carry=0}if(shift===0){return out.concat(a)}for(i=0;i<a.length;i++){out.push(carry|a[i]>>>shift);carry=a[i]<<(32-shift)}last2=a.length?a[a.length-1]:0;shift2=sjcl.bitArray.getPartial(last2);out.push(sjcl.bitArray.partial(shift+shift2&31,(shift+shift2>32)?carry:out.pop(),1));return out},_xor4:function(x,y){return[x[0]^y[0],x[1]^y[1],x[2]^y[2],x[3]^y[3]]},byteswapM:function(a){var i,v,m=65280;for(i=0;i<a.length;++i){v=a[i];a[i]=(v>>>24)|((v>>>8)&m)|((v&m)<<8)|(v<<24)}return a}};sjcl.codec.utf8String={fromBits:function(arr){var out="",bl=sjcl.bitArray.bitLength(arr),i,tmp;for(i=0;i<bl/8;i++){if((i&3)===0){tmp=arr[i/4]}out+=String.fromCharCode(tmp>>>8>>>8>>>8);tmp<<=8}return decodeURIComponent(escape(out))},toBits:function(str){str=unescape(encodeURIComponent(str));var out=[],i,tmp=0;for(i=0;i<str.length;i++){tmp=tmp<<8|str.charCodeAt(i);if((i&3)===3){out.push(tmp);tmp=0}}if(i&3){out.push(sjcl.bitArray.partial(8*(i&3),tmp))}return out}};sjcl.codec.hex={fromBits:function(arr){var out="",i;for(i=0;i<arr.length;i++){out+=((arr[i]|0)+263882790666240).toString(16).substr(4)}return out.substr(0,sjcl.bitArray.bitLength(arr)/4)},toBits:function(str){var i,out=[],len;str=str.replace(/\s|0x/g,"");len=str.length;str=str+"00000000";for(i=0;i<str.length;i+=8){out.push(parseInt(str.substr(i,8),16)^0)}return sjcl.bitArray.clamp(out,len*4)}};sjcl.codec.base64={_chars:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",fromBits:function(arr,_noEquals,_url){var out="",i,bits=0,c=sjcl.codec.base64._chars,ta=0,bl=sjcl.bitArray.bitLength(arr);if(_url){c=c.substr(0,62)+"-_"}for(i=0;out.length*6<bl;){out+=c.charAt((ta^arr[i]>>>bits)>>>26);if(bits<6){ta=arr[i]<<(6-bits);bits+=26;i++}else{ta<<=6;bits-=6}}while((out.length&3)&&!_noEquals){out+="="}return out},toBits:function(str,_url){str=str.replace(/\s|=/g,"");var out=[],i,bits=0,c=sjcl.codec.base64._chars,ta=0,x;if(_url){c=c.substr(0,62)+"-_"}for(i=0;i<str.length;i++){x=c.indexOf(str.charAt(i));if(x<0){throw new sjcl.exception.invalid("this isn't base64!")}if(bits>26){bits-=26;out.push(ta^x>>>bits);ta=x<<(32-bits)}else{bits+=6;ta^=x<<(32-bits)}}if(bits&56){out.push(sjcl.bitArray.partial(bits&56,ta,1))}return out}};sjcl.codec.base64url={fromBits:function(arr){return sjcl.codec.base64.fromBits(arr,1,1)},toBits:function(str){return sjcl.codec.base64.toBits(str,1)}};sjcl.cipher.aes=function(key){if(!this._tables[0][0][0]){this._precompute()}var i,j,tmp,encKey,decKey,sbox=this._tables[0][4],decTable=this._tables[1],keyLen=key.length,rcon=1;if(keyLen!==4&&keyLen!==6&&keyLen!==8){throw new sjcl.exception.invalid("invalid aes key size")}this._key=[encKey=key.slice(0),decKey=[]];for(i=keyLen;i<4*keyLen+28;i++){tmp=encKey[i-1];if(i%keyLen===0||(keyLen===8&&i%keyLen===4)){tmp=sbox[tmp>>>24]<<24^sbox[tmp>>16&255]<<16^sbox[tmp>>8&255]<<8^sbox[tmp&255];if(i%keyLen===0){tmp=tmp<<8^tmp>>>24^rcon<<24;rcon=rcon<<1^(rcon>>7)*283}}encKey[i]=encKey[i-keyLen]^tmp}for(j=0;i;j++,i--){tmp=encKey[j&3?i:i-4];if(i<=4||j<4){decKey[j]=tmp}else{decKey[j]=decTable[0][sbox[tmp>>>24]]^decTable[1][sbox[tmp>>16&255]]^decTable[2][sbox[tmp>>8&255]]^decTable[3][sbox[tmp&255]]}}};sjcl.cipher.aes.prototype={encrypt:function(data){return this._crypt(data,0)},decrypt:function(data){return this._crypt(data,1)},_tables:[[[],[],[],[],[]],[[],[],[],[],[]]],_precompute:function(){var encTable=this._tables[0],decTable=this._tables[1],sbox=encTable[4],sboxInv=decTable[4],i,x,xInv,d=[],th=[],x2,x4,x8,s,tEnc,tDec;for(i=0;i<256;i++){th[(d[i]=i<<1^(i>>7)*283)^i]=i}for(x=xInv=0;!sbox[x];x^=x2||1,xInv=th[xInv]||1){s=xInv^xInv<<1^xInv<<2^xInv<<3^xInv<<4;s=s>>8^s&255^99;sbox[x]=s;sboxInv[s]=x;x8=d[x4=d[x2=d[x]]];tDec=x8*16843009^x4*65537^x2*257^x*16843008;tEnc=d[s]*257^s*16843008;for(i=0;i<4;i++){encTable[i][x]=tEnc=tEnc<<24^tEnc>>>8;decTable[i][s]=tDec=tDec<<24^tDec>>>8}}for(i=0;i<5;i++){encTable[i]=encTable[i].slice(0);decTable[i]=decTable[i].slice(0)}},_crypt:function(input,dir){if(input.length!==4){throw new sjcl.exception.invalid("invalid aes block size")}var key=this._key[dir],a=input[0]^key[0],b=input[dir?3:1]^key[1],c=input[2]^key[2],d=input[dir?1:3]^key[3],a2,b2,c2,nInnerRounds=key.length/4-2,i,kIndex=4,out=[0,0,0,0],table=this._tables[dir],t0=table[0],t1=table[1],t2=table[2],t3=table[3],sbox=table[4];for(i=0;i<nInnerRounds;i++){a2=t0[a>>>24]^t1[b>>16&255]^t2[c>>8&255]^t3[d&255]^key[kIndex];b2=t0[b>>>24]^t1[c>>16&255]^t2[d>>8&255]^t3[a&255]^key[kIndex+1];c2=t0[c>>>24]^t1[d>>16&255]^t2[a>>8&255]^t3[b&255]^key[kIndex+2];d=t0[d>>>24]^t1[a>>16&255]^t2[b>>8&255]^t3[c&255]^key[kIndex+3];kIndex+=4;a=a2;b=b2;c=c2}for(i=0;i<4;i++){out[dir?3&-i:i]=sbox[a>>>24]<<24^sbox[b>>16&255]<<16^sbox[c>>8&255]<<8^sbox[d&255]^key[kIndex++];a2=a;a=b;b=c;c=d;d=a2}return out}};sjcl.mode.cbc={name:"cbc",encrypt:function(prp,plaintext,iv,adata){if(adata&&adata.length){throw new sjcl.exception.invalid("cbc can't authenticate data")}if(sjcl.bitArray.bitLength(iv)!==128){throw new sjcl.exception.invalid("cbc iv must be 128 bits")}var i,w=sjcl.bitArray,xor=w._xor4,bl=w.bitLength(plaintext),bp=0,output=[];if(bl&7){throw new sjcl.exception.invalid("pkcs#5 padding only works for multiples of a byte")}for(i=0;bp+128<=bl;i+=4,bp+=128){iv=prp.encrypt(xor(iv,plaintext.slice(i,i+4)));output.splice(i,0,iv[0],iv[1],iv[2],iv[3])}bl=(16-((bl>>3)&15))*16843009;iv=prp.encrypt(xor(iv,w.concat(plaintext,[bl,bl,bl,bl]).slice(i,i+4)));output.splice(i,0,iv[0],iv[1],iv[2],iv[3]);return output},decrypt:function(prp,ciphertext,iv,adata){if(adata&&adata.length){throw new sjcl.exception.invalid("cbc can't authenticate data")}if(sjcl.bitArray.bitLength(iv)!==128){throw new sjcl.exception.invalid("cbc iv must be 128 bits")}if((sjcl.bitArray.bitLength(ciphertext)&127)||!ciphertext.length){throw new sjcl.exception.corrupt("cbc ciphertext must be a positive multiple of the block size")}var i,w=sjcl.bitArray,xor=w._xor4,bi,bo,output=[];adata=adata||[];for(i=0;i<ciphertext.length;i+=4){bi=ciphertext.slice(i,i+4);bo=xor(iv,prp.decrypt(bi));output.splice(i,0,bo[0],bo[1],bo[2],bo[3]);iv=bi}bi=output[i-1]&255;if(bi===0||bi>16){throw new sjcl.exception.corrupt("pkcs#5 padding corrupt")}bo=bi*16843009;if(!w.equal(w.bitSlice([bo,bo,bo,bo],0,bi*8),w.bitSlice(output,output.length*32-bi*8,output.length*32))){throw new sjcl.exception.corrupt("pkcs#5 padding corrupt")}return w.bitSlice(output,0,output.length*32-bi*8)}};sjcl.hash.sha256=function(hash){if(!this._key[0]){this._precompute()}if(hash){this._h=hash._h.slice(0);this._buffer=hash._buffer.slice(0);this._length=hash._length}else{this.reset()}};sjcl.hash.sha256.hash=function(data){return(new sjcl.hash.sha256()).update(data).finalize()};sjcl.hash.sha256.prototype={blockSize:512,reset:function(){this._h=this._init.slice(0);this._buffer=[];this._length=0;return this},update:function(data){if(typeof data==="string"){data=sjcl.codec.utf8String.toBits(data)}var i,b=this._buffer=sjcl.bitArray.concat(this._buffer,data),ol=this._length,nl=this._length=ol+sjcl.bitArray.bitLength(data);if(nl>9007199254740991){throw new sjcl.exception.invalid("Cannot hash more than 2^53 - 1 bits")}if(typeof Uint32Array!=="undefined"){var c=new Uint32Array(b);var j=0;for(i=512+ol-((512+ol)&511);i<=nl;i+=512){this._block(c.subarray(16*j,16*(j+1)));j+=1}b.splice(0,16*j)}else{for(i=512+ol-((512+ol)&511);i<=nl;i+=512){this._block(b.splice(0,16))}}return this},finalize:function(){var i,b=this._buffer,h=this._h;b=sjcl.bitArray.concat(b,[sjcl.bitArray.partial(1,1)]);for(i=b.length+2;i&15;i++){b.push(0)}b.push(Math.floor(this._length/4294967296));b.push(this._length|0);while(b.length){this._block(b.splice(0,16))}this.reset();return h},_init:[],_key:[],_precompute:function(){var i=0,prime=2,factor,isPrime;function frac(x){return(x-Math.floor(x))*4294967296|0}for(;i<64;prime++){isPrime=true;for(factor=2;factor*factor<=prime;factor++){if(prime%factor===0){isPrime=false;break}}if(isPrime){if(i<8){this._init[i]=frac(Math.pow(prime,1/2))}this._key[i]=frac(Math.pow(prime,1/3));i++}}},_block:function(w){var i,tmp,a,b,h=this._h,k=this._key,h0=h[0],h1=h[1],h2=h[2],h3=h[3],h4=h[4],h5=h[5],h6=h[6],h7=h[7];for(i=0;i<64;i++){if(i<16){tmp=w[i]}else{a=w[(i+1)&15];b=w[(i+14)&15];tmp=w[i&15]=((a>>>7^a>>>18^a>>>3^a<<25^a<<14)+(b>>>17^b>>>19^b>>>10^b<<15^b<<13)+w[i&15]+w[(i+9)&15])|0}tmp=(tmp+h7+(h4>>>6^h4>>>11^h4>>>25^h4<<26^h4<<21^h4<<7)+(h6^h4&(h5^h6))+k[i]);h7=h6;h6=h5;h5=h4;h4=h3+tmp|0;h3=h2;h2=h1;h1=h0;h0=(tmp+((h1&h2)^(h3&(h1^h2)))+(h1>>>2^h1>>>13^h1>>>22^h1<<30^h1<<19^h1<<10))|0}h[0]=h[0]+h0|0;h[1]=h[1]+h1|0;h[2]=h[2]+h2|0;h[3]=h[3]+h3|0;h[4]=h[4]+h4|0;h[5]=h[5]+h5|0;h[6]=h[6]+h6|0;h[7]=h[7]+h7|0}};