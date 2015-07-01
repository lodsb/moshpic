var moshpic = (function() {
  var headerOffset = 50;

  var moshpicBundle = {


      // cant use alpha channel because of browser premul
      // see https://stackoverflow.com/questions/4309364/why-does-html-canvas-getimagedata-not-return-the-exact-same-values-that-were-j
      bytesPerPixel : 3,

      // since the info is already compressed, we can use black as mask color
      maskColor : "#000",

      padUintArray: function(orig, padTo) {
        var padding = (orig.length-1) % padTo;
        var data = new Uint8Array(orig.length + padding);

        for(var i = 0; i < data.length; i++) {
            if(i < orig.length) {
              data[i] = orig[i];
            } else {
              data[i] = 0;
            }
        }

        return data;
      },

      toNextSqrt: function(num) {
        num = Math.ceil(num);
        while(Math.sqrt(num) % 1 !== 0) {
          num++;
        }

        return num;
      },

      randomString: function() {
        return _.shuffle(["sleepy","cat","says","lol","moar","lazers","here","now","unicorns"]).join("");
      },

      encode: function(canvas, myString, logoString) {
        // first compress and add some padding to have complete pixel data
        var compressedJsonArray = LZString.compressToUint8Array(myString);
        var toEncode = moshpic.padUintArray(compressedJsonArray, moshpic.bytesPerPixel);

        var origSize = compressedJsonArray.length;


        // should set minimum size?

        var version = 1;
        var reserved= 10;

        var context = canvas.getContext("2d");

        context.fillStyle = moshpic.maskColor;
        context.fillRect(0,0, canvas.width, canvas.height);

        // offset for header
        var offset = canvas.width/headerOffset;

        var rectSpaceWidth   = canvas.width - offset*2;
        var rectSpaceHeight  = canvas.height- offset*2;

        var rectsPerLine = 2;
        var numRectsForInfo = 0;
        var paddingFitLogo  =  0;
        var numRectsForLogo = 0;
        var numRects= 0;
        var rectWidth = 0;
        var logoOffsetRects = 0;

        var paddingRectsToFitDivByThree = 0;
        // need rects per line that is divisible by 3 in order to have logo centered
        // fixed point interation style
        while(rectsPerLine % 3 !== 0) {
          numRectsForInfo = (toEncode.length / moshpic.bytesPerPixel);
          paddingFitLogo  =  numRectsForInfo % 9;
          numRectsForLogo = moshpic.toNextSqrt((numRectsForInfo+paddingFitLogo) / 9);
          numRects= numRectsForLogo + numRectsForInfo + paddingRectsToFitDivByThree;

          numRects = moshpic.toNextSqrt(numRects);

          // pad numRects for fitting square root number
          //console.log(">>> " + numRects + " " + paddingFitLogo + " logo " + numRectsForLogo + " info " + numRectsForInfo);

          rectsPerLine =  Math.ceil(Math.sqrt(numRects));
          rectWidth = Math.round(rectSpaceWidth/rectsPerLine);
          logoOffsetRects = rectsPerLine / 3;

          paddingRectsToFitDivByThree++;
        }

        //console.log("n "+numRects+ ", "+rectsPerLine+", "+rectWidth + " numRectsForInfo "+ numRectsForInfo);

        var infoIdx = 0;
        var i = 0;
        var checksum = 0;

        while(i < numRects) {
          var rectColumnIdx = ( i % rectsPerLine );
          var rectRowIdx = Math.floor(i/rectsPerLine);

          var xPos = rectColumnIdx * rectWidth + offset;
          var yPos = rectRowIdx    * rectWidth + offset;

          // are we in the center pos for the logo?
          if(
            (rectRowIdx >= logoOffsetRects && rectRowIdx < 2*logoOffsetRects)
            &&
            (rectColumnIdx >= logoOffsetRects && rectColumnIdx < 2*logoOffsetRects)
          ){
            context.fillStyle = moshpic.maskColor;
          } else {

            if(infoIdx < numRectsForInfo) {
              var dataIdx = infoIdx*moshpic.bytesPerPixel

              checksum = moshpic.updateChecksum(checksum, toEncode[dataIdx], toEncode[dataIdx+1], toEncode[dataIdx+2]);
              if(isNaN(checksum)){
                console.log(toEncode[dataIdx]);
                console.log(toEncode[dataIdx+1]);
                console.log(toEncode[dataIdx+2]);
                console.log(checksumAdd);
              }

              // color coding = data enc
              context.fillStyle = moshpic.UintsToRgbaFillStyle(toEncode, dataIdx);

              infoIdx++;

            } else {
              // padding blocks
              context.fillStyle = moshpic.maskColor;
            }
          }

          xPos = Math.round(xPos);
          yPos = Math.round(yPos);


          //console.log(i + " X " + xPos+" / "+yPos);

          context.fillRect(xPos, yPos, rectWidth, rectWidth);

          i++;

        }


        // the big B for logo


        textSize = 1000;
        var logoSpace = Math.floor(Math.sqrt(numRectsForLogo-1))*rectWidth;

        do {

          textSize-=2;
          context.font = "bold "+textSize+"px sans-serif";
          var measureText = context.measureText(logoString);

        } while(measureText.width  >= logoSpace)


        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "#FFF";
        context.fillText(logoString, (canvas.width-offset)/2, (canvas.height-offset)/2);

        // header!
        // bg
        var headerOrigSizeLow = origSize % 255;
        var headerOrigSizeHigh = Math.floor(origSize / 255);

        var headerNumRectsLow = numRects % 255;
        var headerNumRectsHigh = Math.floor(numRects / 255);

        //console.log("rgba("+headerOrigSizeHigh+","+headerOrigSizeLow+","+headerNumRectsHigh+","+headerNumRectsLow/255+")");

        // header part 1
        context.fillStyle=moshpic.maskColor;
        context.fillRect(0,0,offset, offset);
        context.fillStyle="rgba("+version+","+headerOrigSizeHigh+","+headerOrigSizeLow+",1.0)";
        context.fillRect(offset, 0, canvas.width, offset);

        // header part 2
        context.fillStyle="rgba("+checksum+","+headerNumRectsHigh+","+headerNumRectsLow+", 1.0)";
        context.fillRect(0,offset, offset , canvas.height/2);

        // header part 3
        context.fillStyle="rgba("+rectsPerLine+","+0+","+0+", 1.0)";
        context.fillRect(0,canvas.height/2, offset , canvas.height);

        /*
        console.log("Header: checksum "+checksum+" hoh "+headerOrigSizeHigh + " hol "+headerOrigSizeLow +" hnh "+headerNumRectsHigh + " hnl "+headerNumRectsLow);
        console.log("original datasize "+origSize);
        */

      },

      updateChecksum: function(myChecksum, r,g,b){
        return (myChecksum+r+g+b+13)%255;
      },

      getColors: function(pixelData) {
        var out = [];

        var last_r = -1;
        var last_g = -1;
        var last_b = -1;
        var last_a = -1;

        for(var i = 0; i < pixelData.length/4; i+=4) {
          var cur_r = pixelData[i];
          var cur_g = pixelData[i+1];
          var cur_b = pixelData[i+2];
          var cur_a = pixelData[i+3];

          if(
              (last_r != cur_r) &&
              (last_g != cur_g) &&
              (last_b != cur_b) &&
              (last_a != cur_a)
            ) {

              out.push({r: cur_r, g: cur_b, b: cur_b, a: cur_a});

            }

            last_r = cur_r;
            last_g = cur_g;
            last_b = cur_b;
            last_a = cur_a;
        }

        return out;

      },


      getPixelData: function(pixelData, x,y, width) {
        var pos = x + ( y*width );
        var idx = pos*4;
        return {r: pixelData[idx], g: pixelData[idx+1],  b: pixelData[idx+2] };
      },

      decode: function(canvas, imageElement) {
        context = canvas.getContext("2d");

        context.drawImage(imageElement, 0,0);

        var pixelData = context.getImageData(0,0, canvas.width, canvas.height).data;

        var headerOffsetDec = canvas.width/headerOffset;

        var getPixel = function(x,y) {
                        var ret = moshpic.getPixelData(pixelData, x, y, canvas.width);
                        // mark position
                        context.fillStyle = "#FF0";
                        context.fillRect(x,y,2,2);
                        return ret;
                      };

        var getLinePixel = function(y) {
                      var ret = [];

                      for(var i = 0; i < canvas.width; i++) {
                        ret.push(getPixel(i,y));
                      }

                      return ret;
        }


        // take data from the centers of the header parts
        var headerPart1 = getPixel(canvas.width/2, headerOffsetDec/4);
        var headerPart2 = getPixel(headerOffsetDec/4, canvas.width/4);
        var headerPart3 = getPixel(headerOffsetDec/4, canvas.width*(3/4));

        var version = headerPart1.r;
        var dataSize= (headerPart1.g*255)+headerPart1.b;
        var checksum= headerPart2.r;
        var numRects= (headerPart2.g*255) + headerPart2.b;
        var numRectsPerLine= headerPart3.r;


        /*
        console.log("version "+version);
        console.log("dataSize "+dataSize);
        console.log("checksum "+checksum);
        console.log("numRects "+numRects);
        console.log("numRectsPerLine "+numRectsPerLine);*/


        var firstLine = getLinePixel(Math.ceil(1.5*headerOffsetDec));
        var endPixelInfoRow = _.findIndex(firstLine, {r:0, g: 0, b: 0});
        var startPixelInfoRow = _.findLastIndex(firstLine, headerPart2) + 2;
        var lengthOfPixelInfoRow = endPixelInfoRow-startPixelInfoRow;

        var widthOfPixelRect = Math.ceil(lengthOfPixelInfoRow / numRectsPerLine);

        /*
        console.log("startPixelInfoRow of row : "+startPixelInfoRow);
        console.log("endPixelInfoRow of row : "+endPixelInfoRow);
        console.log("lengthOfPixelInfoRow : "+lengthOfPixelInfoRow);
        console.log("widthOfPixelRect: "+widthOfPixelRect);*/

        // mask center logo
        var centerLogoStart = Math.ceil(lengthOfPixelInfoRow/3) + headerOffsetDec;
        var centerLogoEnd  = centerLogoStart - headerOffsetDec;
        context.fillStyle = moshpic.maskColor;
        context.fillRect(centerLogoStart, centerLogoStart, centerLogoEnd, centerLogoEnd);
        // update data
        pixelData = context.getImageData(0,0, canvas.width, canvas.height).data;

        var pixelOffset = Math.floor(headerOffsetDec) + 2;

        var rectDataBlob = [];

        var calculatedChecksum = 0;

        var pushToArray = function(x){
            if(rectDataBlob.length < dataSize) {
              rectDataBlob.push(x);
            }
        };

        for(var i = 0; i < numRects; i++){
          var xRect = i % numRectsPerLine;
          var yRect = Math.floor(i / numRectsPerLine);

          var xPos = pixelOffset + xRect*widthOfPixelRect;
          var yPos = pixelOffset + yRect*widthOfPixelRect;
          var rectData = getPixel(xPos, yPos);

          var _r = rectData.r;
          var _g = rectData.g;
          var _b = rectData.b;

          var _sum = _r + _g + _b;

          // filter out mask color
          if(_sum != 0) {
            pushToArray(_r);
            pushToArray(_g);
            pushToArray(_b);

            var checksumAdd = _sum % 255;

            calculatedChecksum = moshpic.updateChecksum(calculatedChecksum, _r, _g, _b);

          } else {
            context.fillStyle = "#F00";
            context.fillRect(xPos, yPos, 10, 10);
          }

        }
        /*
        console.log(rectDataBlob.length);
        console.log(rectDataBlob.length/3);
        console.log(calculatedChecksum);*/

        if(checksum != calculatedChecksum) {
          throw new Error("Checksums do not match!!");
        } else {
          console.log("YAY! checksums match!")
        }


        var uintData = new Uint8Array(dataSize);

        for(var i = 0; i < rectDataBlob.length; i++) {
          uintData[i] = rectDataBlob[i];
        }


        // get line

        //var colorsDec = getColors(pixelData);




        //console.log(colorsDec);

        return LZString.decompressFromUint8Array(uintData);

      },

      UintsToRgbaFillStyle: function(array, index) {
        var colorString = "rgba("+ array[index] +","+array[index+1] +","+ array[index+2] +", 1.0)";
        //console.log(colorString);

        return colorString;
      }

    };


  return moshpicBundle;
})();
