#!/bin/sh
check_drivers() {
  local STR=$(lsmod | grep "tun ")
  if [ "$STR" == "" ]; then
    echo "Error: kvm and tun drivers not loaded!"
    exit 1
  fi
}

check_interface() {
  local ifce=$1
  local STR=$(ip addr show dev ${ifce} 2> /dev/null | grep ${ifce}:)
  if [ "$STR" == "" ]; then
    echo "Error: interface ${ifce} doesn't exist!"
    exit 1
  fi
}

create_bridge() {

  check_drivers
  
  local br=$(ip addr show dev br0 2> /dev/null | grep br0)

  if [ "${br}" == "" ]; then
    # save eth0 current IPv4 address
    echo "Info: saving eth0 IPv4"
    local IP=$(ip addr show dev eth0 | grep "inet " | awk -F' ' '{ print $2 }')
    local BR=$(ip addr show dev eth0 | grep "inet " | awk -F' ' '{ print $4 }')
    local GWIP=$(ip route | grep "default " | awk -F' ' '{ print $3 }')
    local GWIFIP=$(ip route |  grep "default " | awk -F' ' '{ print $7 }')
    local NT=$(ip route | grep link | grep ${GWIFIP} | awk -F' ' '{ print $1 }')

    # Create a bridge
    echo "Info: create br0"
    ip link add br0 type bridge

    # Now start br0 interface
    echo "Info: starting br0"
    ip link set dev br0 up

    # Remove IPv4 from eth0 and add it to br0
    echo "Info: move eth0 IPv4 (${IP}) to br0"
    ip addr del $IP dev eth0
    ip addr add $IP broadcast $BR dev br0

    # Add one of your physical interface to the bridge
    echo "Info: adding eth0 to bridge"
    ip link set eth0 master br0

    # Ensure br0 is up
    ip link set dev br0 up

    # Fix route
    sleep 1s
    ip route add default via $GWIP dev br0 src $GWIFIP
    sleep 1s
    ip route add $NT dev br0 proto kernel scope link src $GWIFIP
  else
    echo "Info: interface br0 exists"
  fi
}

delete_bridge()
{
  local br=$(ip addr show dev br0 2> /dev/null | grep br0)

  if [ "${br}" != "" ]; then
    # save br0 current IPv4 address
    echo "Info: saving br0 IPv4"
    local IP=$(ip addr show dev br0 | grep "inet " | awk -F' ' '{ print $2 }')
    local BR=$(ip addr show dev br0 | grep "inet " | awk -F' ' '{ print $4 }')
    local GW=$(ip route | grep "default " | awk -F' ' '{ print $3 }')
    local GWIF=$(ip route |  grep "default " | awk -F' ' '{ print $7 }')
    local NT=$(ip route | grep link | grep ${GWIF} | awk -F' ' '{ print $1 }')

    # Remove eth0 from bridge
    echo "Info: remove eth0 from br0"
    ip link set eth0 nomaster

    # Remove IPv4 from br0 and add it to eth0
    echo "Info: move br0 IPv4 (${IP}) to eth0"
    ip addr del $IP dev br0
    ip addr add $IP broadcast $BR dev eth0

    # Now delete br0 interface
    echo "Info: delete br0"
    ip link delete br0 type bridge

    # Fix route
    ip route add $NT dev eth0 proto kernel scope link src $GWIF
    ip route add default via $GW src $GWIF

  else
    echo "Info: interface br0 doesn't exist"
  fi
}

create_tap() {
  #set -x
  local tap=$1
  switch=br0

  check_drivers
  check_interface br0

  if [ -n "$1" ]; then
    local br=$(ip addr show dev ${tap} 2> /dev/null | grep ${tap})

    if [ "${br}" == "" ]; then   
      echo "Info: creating interface ${tap}"
      ip tuntap add ${tap} mode tap user `whoami`
      ip link set ${tap} up
      sleep 0.5s
      ip link set ${tap} master $switch
    else
      echo "Info: ${tap} exists."
    fi
  else
    echo "Error: no interface specified, i.e. tap0"
    exit 1
  fi
}

insert_module()
{
  local module=$1
  local symbol=$2
  if ! /sbin/lsmod | grep -q "\<${symbol}\>"; then
    /sbin/insmod /lib/modules/${module} || \
    ( /usr/bin/logger -p err "Failed to insert ${module}, stop"; false )
  else
    true
  fi
}

load_drivers() {
  echo "Info: loading drivers"
  mkdir -p /var/run/libvirt
  # Clean up a pidfile that might be left around
  rm -f /var/run/libvirtd.pid
  # load needed kernel module
  insert_module kvm.ko kvm
  insert_module kvm-intel.ko kvm_intel
  insert_module vhost.ko vhost
  insert_module tun.ko tun
  insert_module vhost_net.ko vhost_net
  # vhost_scsi.ko were inserted in synoiscsiep
  insert_module pci-stub.ko pci_stub
  #/var/packages/Virtualization/target/bin/synoccctool --update-libvirt-env || true
}

stop () {
  [ ! -S $1 ] && echo "No socket!" && exit 1
  /opt/qemu/bin/qmp --path=$1 system_powerdown
}

status () {
  [ ! -S $1 ] && echo "No socket!" && exit 1
  /opt/qemu/bin/qmp --path=$1 query-status
}

shell () {
  [ ! -S $1 ] && echo "No socket!" && exit 1
  /opt/qemu/bin/qmp-shell -H $1
}

force_stop () {
  [ ! -S $1 ] && echo "No socket!" && exit 1
  /opt/qemu/bin/qmp --path=$1 stop
}

take_screenshot() {
  [ ! -S $1 ] && echo "No socket!" && exit 1
  /opt/qemu/bin/qmp --path=$1 screendump --filename=/tmp/$2.ppm
  /bin/convert /tmp/$2.ppm $2.jpg
  rm /tmp/$2.ppm
}

init () {
  load_drivers
  if [ "$1" != "" ]; then
	create_bridge
	create_tap $1
  fi
}

cleanup () {
  rm $1.jpg
}
