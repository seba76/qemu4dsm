#!/bin/sh

LOGFILE=/var/packages/qemu4dsm/target/ui/api.log

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
  local eth=$1
  local bri=$2
  local br=$(ip addr show dev $bri 2> /dev/null | grep $bri)

  if [ "${br}" == "" ]; then
    # save eth0 current IPv4 address
    echo "Info: saving $eth IPv4"
    local IP=$(ip addr show dev $eth | grep "inet " | awk -F' ' '{ print $2 }')
    local BR=$(ip addr show dev $eth | grep "inet " | awk -F' ' '{ print $4 }')
    local GWIP=$(ip route | grep "default " | awk -F' ' '{ print $3 }')
    local GWIFIP=$(ip route |  grep "default " | awk -F' ' '{ print $7 }')
    local NT=$(ip route | grep link | grep ${GWIFIP} | awk -F' ' '{ print $1 }')

    # Create a bridge
    echo "Info: create $bri"
    ip link add $bri type bridge

    # Now start br0 interface
    echo "Info: starting $bri"
    ip link set dev $bri up

    # Remove IPv4 from eth0 and add it to br0
    echo "Info: move $eth IPv4 (${IP}) to $bri"
    ip addr del $IP dev $eth
    ip addr add $IP broadcast $BR dev $bri

    # Add one of your physical interface to the bridge
    echo "Info: adding eth0 to bridge"
    ip link set $eth master $bri

    # Ensure br0 is up
    ip link set dev $bri up

    # Fix route
    sleep 1s
    ip route add default via $GWIP dev $bri src $GWIFIP
    sleep 1s
    ip route add $NT dev $bri proto kernel scope link src $GWIFIP
  else
    echo "Info: interface $bri exists"
  fi
}

delete_bridge()
{
  local eth=$1
  local bri=$2
  local br=$(ip addr show dev $bri 2> /dev/null | grep $bri)

  if [ "${br}" != "" ]; then
    # save br0 current IPv4 address
    echo "Info: saving $bri IPv4"
    local IP=$(ip addr show dev $bri | grep "inet " | awk -F' ' '{ print $2 }')
    local BR=$(ip addr show dev $bri | grep "inet " | awk -F' ' '{ print $4 }')
    local GW=$(ip route | grep "default " | awk -F' ' '{ print $3 }')
    local GWIF=$(ip route |  grep "default " | awk -F' ' '{ print $7 }')
    local NT=$(ip route | grep link | grep ${GWIF} | awk -F' ' '{ print $1 }')

    # Remove eth0 from bridge
    echo "Info: remove $eth from $bri"
    ip link set $eth nomaster

    # Remove IPv4 from br0 and add it to eth0
    echo "Info: move $bri IPv4 (${IP}) to $eth"
    ip addr del $IP dev $bri
    ip addr add $IP broadcast $BR dev $eth

    # Now delete br0 interface
    echo "Info: delete $bri"
    ip link delete $bri type bridge

    # Fix route
    ip route add $NT dev $eth proto kernel scope link src $GWIF
    ip route add default via $GW src $GWIF

  else
    echo "Info: interface $bri doesn't exist"
  fi
}

# create_tap tap0 br0
create_tap() {
  #set -x
  local tap=$1
  switch=$2

  check_drivers
  check_interface $switch

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

# create_tap_ovs tap1 ovs_eth0
create_tap_ovs() {
  #set -x
  local tap=$1
  switch=$2

  check_drivers
  check_interface $switch

  if [ -n "$1" ]; then
    local br=$(ip addr show dev ${tap} 2> /dev/null | grep ${tap})

    if [ "${br}" == "" ]; then   
      echo "Info: creating interface ${tap}"
      ip tuntap add ${tap} mode tap user `whoami`
      ip link set ${tap} up
      sleep 0.5s
      /bin/ovs-vsctl add-port $switch $tap
      sleep 0.5s
      ip link set ovs_system up
    else
      echo "Info: ${tap} exists."
    fi
  else
    echo "Error: no interface specified, i.e. tap0"
    exit 1
  fi
}

delete_tap() {
  local tap=$1
  local br=$(ip addr show dev $tap 2> /dev/null | grep $tap)

  if [ "${br}" != "" ]; then
	ip tuntap del dev $tap mode tap
  else
    echo "Info: interface $tap doesn't exist"
  fi
}

delete_tap_ovs() {
  local tap=$1
  local br=$(ip addr show dev $tap 2> /dev/null | grep $tap)

  if [ "${br}" != "" ]; then
	/bin/ovs-vsctl del-port $tap
	ip tuntap del dev $tap mode tap
  else
    echo "Info: interface $tap doesn't exist"
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
  echo "Info: loading drivers" >> $LOGFILE
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
  echo "Info: stop called for $VMNAME" >> $LOGFILE
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
  echo "Info: force-stop called for $VMNAME" >> $LOGFILE
  [ ! -S $1 ] && echo "No socket!" && exit 1
  /opt/qemu/bin/qmp --path=$1 stop
}

take_screenshot() {
  [ ! -S $1 ] && echo "No socket!" && exit 1
  /opt/qemu/bin/qmp --path=$1 screendump --filename=/tmp/$2.ppm
  /bin/convert /tmp/$2.ppm $2.jpg
  rm /tmp/$2.ppm
}

# init tap1 eth0 br0
# init tap1 ovs_eth0
init () {
  echo "Info: init called for $VMNAME" >> $LOGFILE
  load_drivers
  if [ "$1" != "" ]; then
	#create_bridge $2 $3
	#create_tap $1 $3
	create_tap_ovs $1 $2
  fi
}

cleanup () {
  [ -f $1.jpg ] && rm $1.jpg
}
