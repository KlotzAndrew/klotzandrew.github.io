---
layout: post
title: "gke ssd helm"
date: 2019-01-28 17:20:00 -0500
categories: gke, ssd, PersistentVolumes, helm
featured: images/gke_ssd_helm.png
---

By default GKE does not use SSD for Persistance Volumes (PV), which is a little
annoying since that is usually what I am looking for. I bumped into this
while deploying a helm chart, then googling around for "helm pv pending" and
"helm ssd pv stuck" to resolve the resource never being allocated.

While there is documentation on gcp, I started off a chart that recommended setting using
`--set storageClassName=faster` to avoid using the standard non-ssd storage type.
On a vanilla setup, this will leave a PV stuck in pending, even after you have
gotten a coffee.

You will need to define a storage class with the `parameters.type=pd-ssd`, the
`metadata.name` field is what your ssd PV type will be available as

```yaml
# ssd-pv.yaml

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ssd
provisioner: kubernetes.io/gce-pd
parameters:
  type: pd-ssd
```

`kubectl apply -f ssd-pv.yaml`

Now we can use `--set storageClassName=ssd` to get a SSD PV storage. Now
looking back at the helm documentation, it is obvious that the author had
indended the reader to have set `metadata.name=faster` as the name for SSD storage
before installing the chart

The google documentation is over here: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/ssd-pd
