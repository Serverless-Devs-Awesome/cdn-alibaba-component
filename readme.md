# 前言
通过本组件，您可以简单快速地通过阿里云CDN对域名进行加速配置

# 使用
## 部署操作
```
s project deploy
```

## 移除操作
```
s project remove
```

## 刷新操作
```
s project refresh -p/--path /abc -a/--area domestic
```

## 预热操作
```
s project preload -p/--path /abc -t/--type directory
```


## 停用操作
```
xianbintang  ~/workspace/cdn-alibaba   master ✘ ✹  s stop                                                                                                                                                          15:19:12 

Start ......
It is detected that your project has the following project/projects < CdnDemoProject > to be execute
Start executing project CdnDemoProject
CDN config stopping
domain prettyzxx.com stopped
stop CDN config succeed
Project CdnDemoProject successfully to execute 
        
End of method: stop
```

## 启用操作
```
xianbintang  ~/workspace/cdn-alibaba   master ✘ ✹  s start                                                                                                                                                         15:18:54 

Start ......
It is detected that your project has the following project/projects < CdnDemoProject > to be execute
Start executing project CdnDemoProject
CDN config starting
domain prettyzxx.com started
start CDN config succeed
Project CdnDemoProject successfully to execute 
        
End of method: start
```

## 查询状态
```
 xianbintang  ~/workspace/cdn-alibaba   master ✔  s status                                                                                                                                                          15:16:55 
Start ......
It is detected that your project has the following project/projects < CdnDemoProject > to be execute
Start executing project CdnDemoProject
get CDN domain status...
DomainName: prettyzxx.com
DomainStatus: online
Scope: domestic
SourceInfo: 
  Type: fc_domain
  Content: 31359370-1314839067006888.test.functioncompute.com
  Priority: 20
  Port: 80
  Enabled: online
  Weight: 10
Description: 
CdnType: web
Cname: prettyzxx.com.w.alikunlun.com
get CDN domain status succeed
Project CdnDemoProject successfully to execute 
        
End of method: status
```

# 完整YAML示例

# 详细使用方法