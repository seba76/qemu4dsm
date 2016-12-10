# INFO.sh
. /pkgscripts/include/pkg_util.sh
package="qemu4dsm"
version="0.0.33"
maintainer="seba"
maintainer_url="http://github.com/seba-0"
displayname="qemu4dsm"
distributor="seba"
distributor_url="http://github.com/seba-0"
arch="x86_64"
exclude_arch="x86 cedarview dockerx64 kvmx64"
firmware="6.0-7312"
report_url="http://github.com/seba-0/qemu4dsm/issues"
dsmuidir="ui"
dsmappname="com.seba.qemu4dsm"
thirdparty="yes"
description_enu="QEMU (short for Quick Emulator) is a free and open-source hosted hypervisor that performs hardware virtualization (not to be confused with hardware-assisted virtualization)."
description="QEMU (short for Quick Emulator) is a free and open-source hosted hypervisor that performs hardware virtualization (not to be confused with hardware-assisted virtualization)."
firmware="$1"
[ "$(caller)" != "0 NULL" ] && return 0
pkg_dump_info
