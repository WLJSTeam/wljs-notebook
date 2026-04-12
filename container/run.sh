#!/usr/bin/env bash

set -eux -o pipefail

PUID=${PUID:-1000}
PGID=${PGID:-1000}

groupmod -o -g "$PGID" wljs
usermod -o -u "$PUID" wljs


if [ "$(getent passwd wljs | cut -d: -f6)" != "/home/wljs" ]; then
  mkdir -p /home/wljs
  usermod -d /home/wljs -m wljs
fi

# a bug, no idea why
usermod -d /home/wljs wljs

# Check if the script is running as root and set LICENSE_DIR accordingly
if [ "$PGID" -eq 0 ]; then
  LICENSE_DIR=/root/.WolframEngine/Licensing
  WL_DIR=/root/.WolframEngine
else
  LICENSE_DIR=/home/wljs/.WolframEngine/Licensing
  WL_DIR=/home/wljs/.WolframEngine
fi

mkdir -p $LICENSE_DIR

chmod -R 777 $WL_DIR

chown -R wljs:wljs /wljs
chown -R wljs:wljs /home/wljs

function activate_wolframscript {
  local rc=0
  if [ -z ${WOLFRAMID_USERNAME+x} -o -z ${WOLFRAMID_PASSWORD+x} ]; then
    # Manual activation
    su - wljs -c "wolframscript -activate" || rc=$?
    
    if [ $rc -ne 0 ]; then
      echo "ERROR: Activation failed (exit code $rc)."
      echo "Giving a user an interactive shell"
      exec bash
    fi
  else
    su - wljs -c "expect << 'EOF'
    spawn sh -c {wolframscript -activate}
    
    expect \"Wolfram ID:\" {send \"$WOLFRAMID_USERNAME\r\"}
    expect \"Password:\" {send \"$WOLFRAMID_PASSWORD\r\"}
    
    lassign [wait] pid spawnpid os_error_flag value
    
    exit \$value
    EOF" || rc=$?

    if [ $rc -ne 0 ]; then
      echo "ERROR: Activation with provided credentials failed (exit code $rc)."
      echo "Giving a user an interactive shell"
      exec bash
    fi
  fi

  # WolframEngine base image activates as 'ubuntu', so mathpass may land there
  FOUND_MATHPASS=$(find /home /root -name mathpass 2>/dev/null | head -1)

  if [ -f "$LICENSE_DIR/mathpass" ]; then
    echo "Success!"
  elif [ -n "$FOUND_MATHPASS" ]; then
    echo "Found mathpass at: $FOUND_MATHPASS — copying to $LICENSE_DIR..."
    mkdir -p "$LICENSE_DIR"
    cp "$FOUND_MATHPASS" "$LICENSE_DIR/mathpass"
    echo "Success!"
  else
    echo "ERROR: mathpass not found after activation."
    exec bash
  fi
}

activate_wolframscript

chown -R wljs:wljs /wljs
chown -R wljs:wljs /home/wljs

nginx
su - wljs -c "wolframscript -f /wljs/Scripts/start.wls host 0.0.0.0 http 4000 ws 4001 ws2 4002 wsprefix ws ws2prefix ws2 store_config_in_docs true"