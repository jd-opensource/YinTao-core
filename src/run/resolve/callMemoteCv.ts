import FormData, { Stream } from "form-data"
import axios, { AxiosPromise } from 'axios'
import fs from 'fs'

export  function remoteCvSiftMatch(matchBuffer:Stream,imageBUffer:Buffer): AxiosPromise<any>{
    var data = new FormData();

    data.append('match', matchBuffer);
    data.append('image', imageBUffer,{contentType:'image/png',filename:"screenshot.png"});
    
    var config = {
      method: 'post',
      url: 'http://cherry.jd.com/cv/siftMatch',
      headers: { 
        ...data.getHeaders()
      },
      data : data
    };
    
    return axios(config as any)
}